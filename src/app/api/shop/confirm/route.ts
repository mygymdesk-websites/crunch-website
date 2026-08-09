import { NextResponse } from "next/server";

import { MgdError, mgd } from "@/lib/mgd";
import { humanizeMgdError } from "@/lib/mgd/errors";
import { resolveLocation } from "@/lib/site-settings";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";

/**
 * POST /api/shop/confirm — finalize the paid order, then write the mirror.
 *
 * MyGymDesk is the system of record for the money: it verifies the capture
 * against the gym's own gateway, writes the POS invoice and decrements stock.
 * This route records what the WEBSITE still has to do about it — pack it, ship
 * it, or hand it over a counter — and nothing here recomputes a rupee.
 *
 * DELIBERATELY NOT RATE-LIMITED, for the same reason the upstream is
 * budget-exempt: by this point the customer has paid, and a throttle would
 * strand a paid order. Retrying is safe — replaying a capture returns the same
 * result with `already: true` — so the client retries once on a transport drop.
 *
 * ORDER OF OPERATIONS. The upstream call happens FIRST and the mirror second.
 * If the mirror write fails, the customer is still told the truth (their order
 * is paid and MyGymDesk has it); we lose only the website's fulfilment view,
 * which an admin can reconstruct from the gym's order number. The reverse
 * order would risk a mirror row for an order that was never paid.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ShopConfirmApiResponse {
  ok: true;
  orderNumber: string;
  invoiceNumber: string | null;
  amountCharged: number;
  currency: string;
  /** Paid, but stock ran out. NOT a failure — the gym confirms availability. */
  oversold: boolean;
  pickupLocationName: string | null;
  alreadyConfirmed: boolean;
  /** False when the local fulfilment mirror could not be written. */
  mirrored: boolean;
}

interface AddressInput {
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
}

function fail(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

function str(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(request: Request) {
  let body: {
    orderId?: unknown;
    payment?: { orderId?: unknown; captureId?: unknown; signature?: unknown };
    fulfilment?: unknown;
    locationSlug?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    gstin?: unknown;
    address?: AddressInput;
    items?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "invalid_json", "Malformed request.");
  }

  const orderId = str(body.orderId);
  const captureId = str(body.payment?.captureId);
  const gatewayOrderId = str(body.payment?.orderId);
  const signature = str(body.payment?.signature, 500) ?? undefined;

  if (!orderId) return fail(400, "invalid_order_id", "Missing order.");
  if (!captureId || !gatewayOrderId) {
    return fail(400, "invalid_capture_id", "Missing payment details.");
  }

  const fulfilment = body.fulfilment === "courier" ? "courier" : "pickup";
  const address =
    fulfilment === "courier"
      ? {
          line1: str(body.address?.line1),
          line2: str(body.address?.line2),
          city: str(body.address?.city),
          state: str(body.address?.state),
          postal_code: str(body.address?.postalCode, 12),
          country: "IN",
        }
      : null;

  // The schema refuses a courier order with no address, and it is right to —
  // but the customer has already paid, so refusing here would be worse than
  // recording it as a pickup for a human to correct. Catch it before the
  // upstream call instead, where nothing has happened yet.
  if (fulfilment === "courier" && (!address?.line1 || !address.city || !address.postal_code)) {
    return fail(400, "invalid_body", "Enter a delivery address.");
  }

  let result;
  try {
    result = await mgd().confirmShopOrder({
      order_id: orderId,
      payment: {
        gateway: "razorpay",
        order_id: gatewayOrderId,
        capture_id: captureId,
        signature,
      },
    });
  } catch (error) {
    if (error instanceof MgdError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 502;
      return fail(status, error.code, humanizeMgdError(error));
    }
    return fail(
      502,
      "network_error",
      "Your payment went through but we couldn't confirm the order. " +
        "Please call the gym — do not pay again.",
    );
  }

  // ---------------------------------------------------------------- mirror
  let mirrored = false;
  try {
    const service = getServiceSupabase();
    const location = await resolveLocation(
      typeof body.locationSlug === "string" ? body.locationSlug : undefined,
    );

    // Attach the order to a signed-in customer when there is one, so it shows
    // in My Orders even if they later change their email.
    const authed = await getServerSupabase();
    const {
      data: { user },
    } = (await authed?.auth.getUser()) ?? { data: { user: null } };

    if (service) {
      const lines = Array.isArray(body.items) ? body.items : [];
      const subtotal = lines.reduce((sum, raw) => {
        const l = raw as { unitPrice?: number; quantity?: number };
        return sum + Number(l.unitPrice ?? 0) * Number(l.quantity ?? 0);
      }, 0);

      const { data: order, error } = await service
        .from("shop_orders")
        .insert({
          // Ours, for the website. The gym's own reference is stored beside it.
          order_number: `CF-S-${result.order_number ?? orderId.slice(0, 8)}`,
          mgd_order_number: result.order_number,
          mgd_sale_id: result.order_id,
          mgd_invoice_id: result.invoice_id,
          payment_gateway: "razorpay",
          payment_order_id: gatewayOrderId,
          payment_capture_id: captureId,
          customer_user_id: user?.id ?? null,
          customer_name: str(body.name) ?? "",
          customer_phone: str(body.phone) ?? "",
          customer_email: str(body.email) ?? "",
          customer_gstin: str(body.gstin, 20),
          location_id: location?.id ?? null,
          location_slug: location?.slug ?? null,
          fulfilment,
          status: fulfilment === "pickup" ? "placed" : "placed",
          shipping_address: address,
          currency: result.currency ?? "INR",
          // Snapshots of what MGD resolved, never recomputed here.
          subtotal,
          grand_total: result.amount_charged,
          oversold: Boolean(result.oversold),
        })
        .select("id")
        .single();

      if (!error && order) {
        const items = lines.map((raw) => {
          const l = raw as {
            productId?: string;
            name?: string;
            quantity?: number;
            unitPrice?: number;
            brand?: string;
            imageUrl?: string;
          };
          return {
            order_id: order.id,
            mgd_product_id: l.productId ?? null,
            brand: l.brand ?? null,
            name: l.name ?? "Item",
            image_url: l.imageUrl ?? null,
            quantity: Number(l.quantity ?? 1),
            unit_price: Number(l.unitPrice ?? 0),
            line_total: Number(l.unitPrice ?? 0) * Number(l.quantity ?? 1),
          };
        });
        if (items.length) await service.from("shop_order_items").insert(items);
        mirrored = true;
      } else if (error) {
        console.error("[shop/confirm] mirror insert failed:", error.message);
      }
    }
  } catch (error) {
    // Never fail the response for this. The money is real and the gym has the
    // order; the mirror is our convenience, not the customer's problem.
    console.error("[shop/confirm] mirror write threw:", error);
  }

  const payload: ShopConfirmApiResponse = {
    ok: true,
    orderNumber: result.order_number,
    invoiceNumber: result.invoice_number,
    amountCharged: result.amount_charged,
    currency: result.currency,
    oversold: Boolean(result.oversold),
    pickupLocationName: result.pickup_location_name,
    alreadyConfirmed: Boolean(result.already),
    mirrored,
  };

  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
