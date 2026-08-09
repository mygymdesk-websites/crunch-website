"use server";

import { revalidatePath } from "next/cache";

import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import { canTransition, stampFor } from "@/lib/orders";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ShopOrderStatus } from "@/lib/supabase/types";

/**
 * Advance a shop order one step along its own lane.
 *
 * Every rule is enforced here, not in the buttons: the caller is an admin, the
 * move is the legal next one for THIS order's fulfilment type, and a courier
 * order cannot be marked shipped without a shipment to ship. The UI hides the
 * illegal moves as a courtesy; this refuses them.
 *
 * The write itself runs as the signed-in admin, so RLS re-checks `is_admin()`
 * independently — a stolen action call from a non-admin session updates
 * nothing even if it got past the gate above.
 */

export type OrderActionResult = { ok: true } | { ok: false; message: string };

export async function advanceOrder(
  orderId: string,
  to: ShopOrderStatus,
): Promise<OrderActionResult> {
  const gate = await getAdminGate();
  if (gate.status !== "ok") {
    return { ok: false, message: "You are not signed in as an admin." };
  }
  if (!canEditSettings(gate.admin)) {
    return { ok: false, message: "Your role is read-only for fulfilment." };
  }

  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { data: order, error: readError } = await supabase
    .from("shop_orders")
    .select("id, status, fulfilment")
    .eq("id", orderId)
    .maybeSingle();

  if (readError || !order) {
    return { ok: false, message: "That order no longer exists." };
  }

  if (!canTransition(order.fulfilment, order.status, to)) {
    return {
      ok: false,
      message: `A ${order.fulfilment} order cannot go from ${order.status} to ${to}.`,
    };
  }

  // A courier order marked shipped with no shipment leaves the customer with a
  // status and no way to track it. Refuse it rather than produce a dead end.
  if (to === "shipped") {
    const { count } = await supabase
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);

    if (!count) {
      return {
        ok: false,
        message: "Create the shipment first — shipped needs an AWB to track.",
      };
    }
  }

  const stamp = stampFor(to);
  const patch: Record<string, unknown> = { status: to };
  if (stamp) patch[stamp] = new Date().toISOString();

  const { error } = await supabase
    .from("shop_orders")
    .update(patch)
    .eq("id", orderId)
    // Re-assert the from-state so two admins clicking at once cannot both
    // advance it; the second update matches nothing and reports honestly.
    .eq("status", order.status);

  if (error) {
    return { ok: false, message: `Could not update: ${error.message}` };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/shipments");
  revalidatePath("/account");
  return { ok: true };
}
