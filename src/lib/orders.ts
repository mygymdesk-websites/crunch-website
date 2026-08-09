import type { FulfilmentType, ShopOrderStatus } from "@/lib/supabase/types";

/**
 * The fulfilment state machine, in one place.
 *
 * Two lanes that never cross. A pickup order is handed over a counter and can
 * never be "shipped"; a courier order has no "collected". Encoding that here
 * rather than in the admin buttons means the server action, the UI and any
 * later automation all agree on what a legal move is — and a wrong-lane
 * transition is refused rather than merely un-clickable.
 */

export const PICKUP_FLOW: ShopOrderStatus[] = [
  "placed",
  "ready_for_pickup",
  "collected",
];

export const COURIER_FLOW: ShopOrderStatus[] = [
  "placed",
  "packed",
  "shipped",
  "delivered",
];

export function flowFor(fulfilment: FulfilmentType): ShopOrderStatus[] {
  return fulfilment === "pickup" ? PICKUP_FLOW : COURIER_FLOW;
}

/** The single legal next status, or null at the end of the lane. */
export function nextStatus(
  fulfilment: FulfilmentType,
  current: ShopOrderStatus,
): ShopOrderStatus | null {
  const flow = flowFor(fulfilment);
  const i = flow.indexOf(current);
  if (i === -1 || i === flow.length - 1) return null;
  return flow[i + 1];
}

/**
 * Forward-only, one step at a time, within the order's own lane.
 *
 * Deliberately not reversible: these transitions mirror something physical
 * that already happened. "Un-shipping" a parcel is not a state change, it is a
 * correction — and a correction should be a deliberate, audited act rather
 * than a stray click in a list.
 */
export function canTransition(
  fulfilment: FulfilmentType,
  from: ShopOrderStatus,
  to: ShopOrderStatus,
): boolean {
  return nextStatus(fulfilment, from) === to;
}

export const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  placed: "Placed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  ready_for_pickup: "Ready for pickup",
  collected: "Collected",
};

/** The verb on the button that performs the transition. */
export const TRANSITION_LABEL: Record<ShopOrderStatus, string> = {
  placed: "Reopen",
  packed: "Mark packed",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  ready_for_pickup: "Mark ready",
  collected: "Mark collected",
};

/** Chip tone. Terminal states read as done; everything else is in flight. */
export function statusTone(
  status: ShopOrderStatus,
): "accent" | "muted" | "done" {
  if (status === "collected" || status === "delivered") return "done";
  if (status === "placed") return "accent";
  return "muted";
}

/** The timestamp column a transition should stamp, if any. */
export function stampFor(status: ShopOrderStatus): string | null {
  switch (status) {
    case "packed":
      return "packed_at";
    case "shipped":
      return "dispatched_at";
    case "ready_for_pickup":
      return "packed_at";
    case "delivered":
    case "collected":
      return "completed_at";
    default:
      return null;
  }
}
