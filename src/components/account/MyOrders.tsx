"use client";

import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Modal";
import { formatDate, formatINR } from "@/lib/format";
import { STATUS_LABEL, statusTone } from "@/lib/orders";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Shipment, ShopOrder, ShopOrderItem } from "@/lib/supabase/types";

/**
 * A customer's own orders, read straight from the mirror.
 *
 * The query is deliberately unfiltered by identity: RLS decides what comes
 * back. A policy that only returns your own rows is a stronger guarantee than
 * a `.eq("customer_email", …)` a client could rewrite, and it means this
 * component cannot leak someone else's order even if it asks badly.
 */
export function MyOrders({ locationName }: { locationName: string }) {
  const supabase = getBrowserSupabase();
  const [state, setState] = useState<{
    loading: boolean;
    orders: ShopOrder[];
    items: ShopOrderItem[];
    shipments: Shipment[];
    error: string | null;
    // With no Supabase project there is nothing to load, so start at the final
    // state rather than setting it synchronously inside the effect.
  }>({
    loading: Boolean(supabase),
    orders: [],
    items: [],
    shipments: [],
    error: null,
  });
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const { data: orders, error } = await supabase
        .from("shop_orders")
        .select("*")
        .order("placed_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setState({
          loading: false,
          orders: [],
          items: [],
          shipments: [],
          error: "We couldn't load your orders just now.",
        });
        return;
      }

      const rows = (orders ?? []) as ShopOrder[];
      let items: ShopOrderItem[] = [];
      let shipments: Shipment[] = [];

      if (rows.length) {
        const ids = rows.map((o) => o.id);
        const [{ data: itemRows }, { data: shipRows }] = await Promise.all([
          supabase.from("shop_order_items").select("*").in("order_id", ids),
          supabase.from("shipments").select("*").in("order_id", ids),
        ]);
        items = (itemRows ?? []) as ShopOrderItem[];
        shipments = (shipRows ?? []) as Shipment[];
      }

      if (!cancelled) {
        setState({ loading: false, orders: rows, items, shipments, error: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (state.loading) return <Spinner label="Loading your orders…" />;

  if (state.error) {
    return (
      <p className="rounded-[16px] border border-line bg-surface p-6 text-center text-[13px] text-muted">
        {state.error}
      </p>
    );
  }

  if (state.orders.length === 0) {
    return (
      <div className="rounded-[16px] border border-line bg-surface px-5 py-[52px] text-center">
        <div className="mb-2 font-display text-[19px] font-semibold uppercase">
          No orders yet
        </div>
        <p className="mx-auto m-0 mb-[18px] max-w-[46ch] text-[13px] leading-[1.6] text-muted">
          Shop orders placed on this site appear here with their status,
          tracking and GST invoice number. The counter at {locationName} has
          everything in the meantime.
        </p>
        <ButtonLink href="/shop" size="sm">
          Browse the shop
        </ButtonLink>
      </div>
    );
  }

  const itemsByOrder = new Map<string, ShopOrderItem[]>();
  for (const item of state.items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }
  const shipmentByOrder = new Map(state.shipments.map((s) => [s.order_id, s]));

  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
      {state.orders.map((order) => {
        const lines = itemsByOrder.get(order.id) ?? [];
        const shipment = shipmentByOrder.get(order.id);
        const expanded = open === order.id;
        const tone = statusTone(order.status);

        return (
          <div key={order.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : order.id)}
              aria-expanded={expanded}
              className="flex w-full cursor-pointer flex-wrap items-center gap-3 border-0 bg-transparent px-5 py-4 text-left"
            >
              <span className="min-w-0 flex-[1_1_180px]">
                <span className="block text-[14px] font-bold">
                  {order.mgd_order_number ?? order.order_number}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {formatDate(order.placed_at)} ·{" "}
                  {order.fulfilment === "pickup" ? "Collect at gym" : "Delivery"}
                </span>
              </span>

              <span
                className={`shrink-0 rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${
                  tone === "accent"
                    ? "bg-accent text-accent-ink"
                    : tone === "done"
                      ? "bg-surface2 text-muted"
                      : "border border-accent text-text"
                }`}
              >
                {STATUS_LABEL[order.status]}
              </span>

              <span className="shrink-0 text-[15px] font-bold">
                {formatINR(order.grand_total)}
              </span>
            </button>

            {expanded ? (
              <div className="border-t border-line bg-bg px-5 py-4">
                <ul className="m-0 grid list-none gap-2 p-0">
                  {lines.map((line) => (
                    <li key={line.id} className="flex justify-between gap-3 text-[13px]">
                      <span>
                        {line.quantity} × {line.name}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatINR(line.line_total)}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.oversold ? (
                  <p className="m-0 mt-4 rounded-field border border-accent bg-accent-soft p-3 text-[12px] leading-[1.6]">
                    One item went out of stock as you paid. Your payment is safe
                    — the gym will confirm availability before dispatch.
                  </p>
                ) : null}

                {shipment?.tracking_url && shipment.awb ? (
                  <p className="m-0 mt-4 text-[13px]">
                    {shipment.courier ?? "Courier"} · {shipment.awb} ·{" "}
                    <a
                      href={shipment.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="border-b border-accent"
                    >
                      Track this parcel
                    </a>
                  </p>
                ) : order.fulfilment === "courier" ? (
                  <p className="m-0 mt-4 text-[12px] text-muted">
                    Tracking appears here once the parcel is booked with the
                    courier.
                  </p>
                ) : null}

                {order.mgd_invoice_id ? (
                  <p className="m-0 mt-3 text-[12px] text-muted">
                    GST invoice {order.mgd_invoice_id} was emailed to{" "}
                    {order.customer_email}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
