import { NextResponse } from "next/server";

import { isValidEmail, isValidIndianMobile, toE164 } from "@/lib/format";
import { MgdError, mgd } from "@/lib/mgd";
import { humanizeMgdError } from "@/lib/mgd/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { resolveLocation } from "@/lib/site-settings";

/**
 * POST /api/shop/order-create — price the cart and mint the gateway order.
 *
 * The browser sends product ids and quantities. Every price is resolved
 * upstream from the same all-in figures the catalogue displays, so a tampered
 * or stale cart cannot change what is charged.
 *
 * ON FULFILMENT: the API has no delivery concept. `pickup_location_id` is its
 * only notion of place — the branch whose stock is checked and decremented.
 * A courier order therefore sends the FULFILLING BRANCH here, and the shipping
 * address never leaves this site; it is written to the local mirror by the
 * confirm route. MyGymDesk sees a branch order either way, which is also what
 * makes its stock maths correct.
 *
 * TODAY THIS RETURNS 503 — no gateway is connected. The code passes through so
 * the checkout renders its designed "launching soon" state.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = { limit: 8, windowMs: 10 * 60 * 1000 };
const MAX_LINES = 50;
const MAX_QTY = 99;

export interface ShopOrderCreateApiResponse {
  ok: true;
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  /** MINOR units (paise) — Checkout's figure. */
  amountInPaise: number;
  /** MAJOR units (rupees) — the display figure. */
  amount: number;
  currency: string;
  keyId: string;
  testMode: boolean;
  pickupLocationName: string | null;
  lines: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

function fail(
  status: number,
  error: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ ok: false, error, message, ...extra }, { status });
}

export async function POST(request: Request) {
  let body: {
    items?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    locationSlug?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "invalid_json", "Malformed request.");
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((raw) => {
      const line = raw as { productId?: unknown; quantity?: unknown };
      const productId =
        typeof line.productId === "string" ? line.productId.trim() : "";
      const quantity = Math.trunc(Number(line.quantity));
      return { product_id: productId, quantity };
    })
    .filter((l) => l.product_id && Number.isFinite(l.quantity));

  if (items.length === 0) return fail(422, "cart_empty", "Your cart is empty.");
  if (items.length > MAX_LINES) {
    return fail(422, "invalid_items", `A single order can hold ${MAX_LINES} lines.`);
  }
  if (items.some((l) => l.quantity < 1 || l.quantity > MAX_QTY)) {
    return fail(400, "invalid_quantity", `Quantities run from 1 to ${MAX_QTY}.`);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (name.length < 2) {
    return fail(400, "invalid_name", "Enter your full name.", { field: "name" });
  }
  if (!isValidIndianMobile(phone)) {
    return fail(400, "invalid_phone", "Enter a valid 10-digit mobile number.", {
      field: "phone",
    });
  }
  if (!isValidEmail(email)) {
    return fail(400, "invalid_email", "Enter a valid email address.", {
      field: "email",
    });
  }

  const limit = rateLimit(`shop:${clientIp(request.headers)}`, LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Too many attempts. Please try again shortly, or call the gym.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  // The branch is resolved server-side from the slug, never taken as a raw id
  // from the browser — that keeps a caller from ordering against a branch the
  // site does not sell for.
  const location = await resolveLocation(
    typeof body.locationSlug === "string" ? body.locationSlug : undefined,
  );
  if (!location?.mgd_location_id) {
    return fail(
      503,
      "location_not_found",
      "This gym isn't set up for online orders yet. Please call the desk.",
    );
  }

  try {
    const order = await mgd().createShopOrder({
      items,
      pickup_location_id: location.mgd_location_id,
      customer: { name, phone: toE164(phone), email },
    });

    const payload: ShopOrderCreateApiResponse = {
      ok: true,
      orderId: order.order_id,
      orderNumber: order.order_number,
      razorpayOrderId: order.razorpay_order_id,
      amountInPaise: order.amount_in_paise,
      amount: order.amount,
      currency: order.currency,
      keyId: order.key_id,
      testMode: order.test_mode,
      pickupLocationName: order.pickup_location_name,
      lines: (order.lines ?? []).map((l) => ({
        productId: l.product_id,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unit_price,
        total: l.total,
      })),
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MgdError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 502;
      // insufficient_stock carries { product_id, available } — pass it through
      // so the cart can correct the offending line in place rather than making
      // the customer guess which item is short.
      const detail = error.body as
        | { product_id?: string; available?: number }
        | undefined;
      return fail(status, error.code, humanizeMgdError(error), {
        productId: detail?.product_id,
        available: detail?.available,
      });
    }
    return fail(
      502,
      "network_error",
      "We couldn't reach the shop right now. Please try again shortly.",
    );
  }
}
