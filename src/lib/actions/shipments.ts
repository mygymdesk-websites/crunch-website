"use server";

import { revalidatePath } from "next/cache";

import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import {
  ShiprocketError,
  isShiprocketConfigured,
  shiprocket,
} from "@/lib/shiprocket";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";
import type { ShopOrder, ShopOrderItem } from "@/lib/supabase/types";

/**
 * Create a Shiprocket shipment for a packed courier order, and refresh
 * tracking on an existing one.
 *
 * UNVERIFIED AGAINST THE LIVE API — no credentials have arrived. Both actions
 * refuse cleanly when Shiprocket is unconfigured rather than throwing, so the
 * admin screen can render the button disabled and say why.
 */

export type ShipmentActionResult =
  | { ok: true; awb: string | null }
  | { ok: false; message: string };

async function requireAdminEditor() {
  const gate = await getAdminGate();
  if (gate.status !== "ok") return "You are not signed in as an admin.";
  if (!canEditSettings(gate.admin)) return "Your role is read-only for fulfilment.";
  return null;
}

export async function createShipment(orderId: string): Promise<ShipmentActionResult> {
  const denied = await requireAdminEditor();
  if (denied) return { ok: false, message: denied };

  if (!isShiprocketConfigured()) {
    return {
      ok: false,
      message: "Shiprocket connection pending — add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.",
    };
  }

  const supabase = await getServerSupabase();
  const service = getServiceSupabase();
  if (!supabase || !service) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const { data: order } = await supabase
    .from("shop_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, message: "That order no longer exists." };

  const row = order as ShopOrder;
  if (row.fulfilment !== "courier") {
    return { ok: false, message: "Only courier orders get a shipment." };
  }
  if (!row.shipping_address?.line1) {
    return { ok: false, message: "This order has no delivery address on file." };
  }

  const { data: itemRows } = await supabase
    .from("shop_order_items")
    .select("*")
    .eq("order_id", orderId);
  const items = (itemRows ?? []) as ShopOrderItem[];

  try {
    const client = shiprocket();
    const created = await client.createOrder({
      orderNumber: row.order_number,
      placedAt: row.placed_at.slice(0, 19).replace("T", " "),
      billing: {
        name: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email,
        line1: row.shipping_address.line1,
        line2: row.shipping_address.line2,
        city: row.shipping_address.city ?? "",
        state: row.shipping_address.state ?? "",
        postalCode: row.shipping_address.postal_code ?? "",
      },
      lines: items.map((i) => ({
        name: i.name,
        sku: i.sku ?? i.mgd_product_id ?? i.name.slice(0, 24),
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })),
      subTotal: row.grand_total,
    });

    // AWB assignment is a separate call and can legitimately fail (no
    // serviceable courier for that PIN). The shipment row is written either
    // way, so a retry does not create a duplicate Shiprocket order.
    let awb: string | null = created.awb;
    let courier: string | null = created.courier;
    let labelUrl: string | null = null;
    let assignError: string | null = null;

    if (!awb && created.shipmentId) {
      try {
        const assigned = await client.assignAwb(created.shipmentId);
        awb = assigned.awb;
        courier = assigned.courier;
        labelUrl = assigned.labelUrl;
      } catch (error) {
        assignError =
          error instanceof ShiprocketError ? error.message : "AWB not assigned";
      }
    }

    // Service role: shipments are ours to write, never the browser's.
    const { error } = await service.from("shipments").insert({
      order_id: orderId,
      shiprocket_order_id: created.orderId || null,
      shiprocket_shipment_id: created.shipmentId || null,
      awb,
      courier,
      label_url: labelUrl,
      status: awb ? "awb_assigned" : "pending",
      status_detail: assignError,
    });

    if (error) return { ok: false, message: `Could not save shipment: ${error.message}` };

    revalidatePath("/admin/shipments");
    revalidatePath("/admin/orders");
    return { ok: true, awb };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ShiprocketError
          ? error.message
          : "Could not reach Shiprocket.",
    };
  }
}

export async function refreshTracking(shipmentId: string): Promise<ShipmentActionResult> {
  const denied = await requireAdminEditor();
  if (denied) return { ok: false, message: denied };

  if (!isShiprocketConfigured()) {
    return { ok: false, message: "Shiprocket connection pending." };
  }

  const supabase = await getServerSupabase();
  const service = getServiceSupabase();
  if (!supabase || !service) return { ok: false, message: "Supabase is not configured." };

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, awb, status_log")
    .eq("id", shipmentId)
    .maybeSingle();

  if (!shipment?.awb) {
    return { ok: false, message: "No AWB on this shipment yet." };
  }

  try {
    const tracking = await shiprocket().track(shipment.awb);
    const log = Array.isArray(shipment.status_log) ? shipment.status_log : [];

    await service
      .from("shipments")
      .update({
        status_detail: tracking.statusDetail,
        delivered_at: tracking.deliveredAt,
        expected_delivery_at: tracking.expectedDeliveryAt,
        // Append-only raw payloads, so parsed columns stay rebuildable.
        status_log: [...log, { at: new Date().toISOString(), raw: tracking.raw }],
      })
      .eq("id", shipmentId);

    revalidatePath("/admin/shipments");
    return { ok: true, awb: shipment.awb };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ShiprocketError ? error.message : "Could not reach Shiprocket.",
    };
  }
}
