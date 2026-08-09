"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createShipment, refreshTracking } from "@/lib/actions/shipments";
import { formatDate, formatINR } from "@/lib/format";
import type { Shipment, ShopOrder } from "@/lib/supabase/types";

export function ShipmentsBoard({
  awaiting,
  shipments,
  orders,
  canEdit,
  shiprocketReady,
}: {
  awaiting: ShopOrder[];
  shipments: Shipment[];
  orders: ShopOrder[];
  canEdit: boolean;
  shiprocketReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const orderById = new Map(orders.map((o) => [o.id, o]));

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setMessage(result.message ?? "That didn't work.");
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-8">
      {!shiprocketReady ? (
        <p className="m-0 rounded-field border border-line bg-surface2 p-4 text-[13px] leading-[1.6] text-muted">
          <b className="text-text">Shiprocket connection pending.</b> Labels and
          tracking stay disabled until <code>SHIPROCKET_EMAIL</code> and{" "}
          <code>SHIPROCKET_PASSWORD</code> are set. Everything else on this
          screen works; orders can still be packed and marked delivered by hand.
        </p>
      ) : null}

      {message ? (
        <p className="m-0 rounded-field border border-accent bg-accent-soft p-3 text-[13px]" role="alert">
          {message}
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 font-display text-[18px] font-semibold uppercase">
          Awaiting a label ({awaiting.length})
        </h2>
        {awaiting.length === 0 ? (
          <p className="m-0 rounded-card border border-dashed border-line px-5 py-10 text-center text-[13px] text-muted">
            Nothing packed and waiting. Courier orders appear here once they are
            marked packed.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-line">
            {awaiting.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center gap-3 border-b border-line bg-bg px-4 py-3.5 last:border-b-0"
              >
                <span className="min-w-0 flex-[1_1_200px]">
                  <span className="block text-[14px] font-bold">
                    {order.mgd_order_number ?? order.order_number}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {order.customer_name} ·{" "}
                    {order.shipping_address?.city ?? "no city"} ·{" "}
                    {order.shipping_address?.postal_code ?? "no PIN"}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-bold">
                  {formatINR(order.grand_total)}
                </span>
                <button
                  type="button"
                  disabled={!canEdit || !shiprocketReady || pending}
                  title={
                    !shiprocketReady ? "Shiprocket connection pending" : undefined
                  }
                  onClick={() => run(() => createShipment(order.id))}
                  className="shrink-0 cursor-pointer rounded-pill border border-accent bg-accent px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create shipment
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-[18px] font-semibold uppercase">
          Shipments ({shipments.length})
        </h2>
        {shipments.length === 0 ? (
          <p className="m-0 rounded-card border border-dashed border-line px-5 py-10 text-center text-[13px] text-muted">
            No shipments yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-line">
            {shipments.map((shipment) => {
              const order = orderById.get(shipment.order_id);
              return (
                <div
                  key={shipment.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line bg-bg px-4 py-3.5 last:border-b-0"
                >
                  <span className="min-w-0 flex-[1_1_200px]">
                    <span className="block text-[14px] font-bold">
                      {shipment.awb ?? "No AWB yet"}
                      {shipment.courier ? (
                        <span className="ml-2 text-[12px] font-normal text-muted">
                          {shipment.courier}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {order?.mgd_order_number ?? order?.order_number ?? "—"} ·{" "}
                      {shipment.status}
                      {shipment.status_detail ? ` · ${shipment.status_detail}` : ""}
                      {" · "}
                      {formatDate(shipment.created_at)}
                    </span>
                  </span>

                  {shipment.label_url ? (
                    <a
                      href={shipment.label_url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-pill border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em]"
                    >
                      Label
                    </a>
                  ) : null}

                  {shipment.tracking_url ? (
                    <a
                      href={shipment.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-pill border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em]"
                    >
                      Track
                    </a>
                  ) : null}

                  <button
                    type="button"
                    disabled={!canEdit || !shiprocketReady || pending || !shipment.awb}
                    title={
                      !shiprocketReady ? "Shiprocket connection pending" : undefined
                    }
                    onClick={() => run(() => refreshTracking(shipment.id))}
                    className="shrink-0 cursor-pointer rounded-pill border border-line bg-transparent px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh tracking
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
