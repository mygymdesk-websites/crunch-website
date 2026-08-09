"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { advanceOrder } from "@/lib/actions/orders";
import { formatDate, formatINR, formatPhone } from "@/lib/format";
import { STATUS_LABEL, TRANSITION_LABEL, nextStatus, statusTone } from "@/lib/orders";
import type {
  Shipment,
  ShopOrder,
  ShopOrderItem,
  ShopOrderStatus,
} from "@/lib/supabase/types";

/**
 * The fulfilment board.
 *
 * Filters live in the URL rather than component state, so a particular view —
 * "courier orders still unpacked at Gurgaon" — is a link an admin can bookmark
 * or send to a colleague, and a refresh doesn't lose it.
 */

const STATUSES: ShopOrderStatus[] = [
  "placed",
  "packed",
  "shipped",
  "delivered",
  "ready_for_pickup",
  "collected",
];

export function OrdersBoard({
  orders,
  items,
  shipments,
  locations,
  canEdit,
  filters,
}: {
  orders: ShopOrder[];
  items: ShopOrderItem[];
  shipments: Shipment[];
  locations: Array<{ slug: string; name: string }>;
  canEdit: boolean;
  filters: {
    status?: string;
    fulfilment?: string;
    branch?: string;
    oversold: boolean;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const itemsByOrder = new Map<string, ShopOrderItem[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }
  const shipmentByOrder = new Map(shipments.map((s) => [s.order_id, s]));

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/orders${next.toString() ? `?${next}` : ""}`);
  }

  function advance(order: ShopOrder, to: ShopOrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await advanceOrder(order.id, to);
      if (!result.ok) setError(result.message);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Status"
          value={filters.status ?? ""}
          onChange={(v) => setFilter("status", v || null)}
          options={[
            { value: "", label: "All statuses" },
            ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
          ]}
        />
        <FilterSelect
          label="Fulfilment"
          value={filters.fulfilment ?? ""}
          onChange={(v) => setFilter("fulfilment", v || null)}
          options={[
            { value: "", label: "Pickup & courier" },
            { value: "pickup", label: "Pickup" },
            { value: "courier", label: "Courier" },
          ]}
        />
        <FilterSelect
          label="Branch"
          value={filters.branch ?? ""}
          onChange={(v) => setFilter("branch", v || null)}
          options={[
            { value: "", label: "All branches" },
            ...locations.map((l) => ({ value: l.slug, label: l.name })),
          ]}
        />
        <button
          type="button"
          onClick={() => setFilter("oversold", filters.oversold ? null : "1")}
          aria-pressed={filters.oversold}
          className={`cursor-pointer rounded-pill border px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] ${
            filters.oversold
              ? "border-accent bg-accent text-accent-ink"
              : "border-line bg-transparent text-muted"
          }`}
        >
          Needs stock check
        </button>
        {(filters.status || filters.fulfilment || filters.branch || filters.oversold) ? (
          <button
            type="button"
            onClick={() => router.push("/admin/orders")}
            className="cursor-pointer border-0 bg-transparent text-[12px] text-muted underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-field border border-accent bg-accent-soft p-3 text-[13px]" role="alert">
          {error}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <div className="rounded-card border border-dashed border-line px-6 py-14 text-center">
          <div className="mb-1.5 font-display text-[18px] font-semibold uppercase">
            No orders here
          </div>
          <p className="m-0 text-[13px] text-muted">
            Either nothing matches these filters, or the shop hasn&rsquo;t taken
            an order yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line">
          {orders.map((order) => {
            const to = nextStatus(order.fulfilment, order.status);
            const shipment = shipmentByOrder.get(order.id);
            const lines = itemsByOrder.get(order.id) ?? [];
            const expanded = open === order.id;

            return (
              <div key={order.id} className="border-b border-line last:border-b-0">
                <div className="flex flex-wrap items-center gap-3 bg-bg px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : order.id)}
                    aria-expanded={expanded}
                    className="min-w-0 flex-[1_1_220px] cursor-pointer border-0 bg-transparent text-left"
                  >
                    <span className="block text-[14px] font-bold">
                      {order.mgd_order_number ?? order.order_number}
                      {order.oversold ? (
                        <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-accent-ink">
                          Stock check
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {order.customer_name} · {formatPhone(order.customer_phone)} ·{" "}
                      {formatDate(order.placed_at)}
                    </span>
                  </button>

                  <StatusChip status={order.status} />

                  <span className="shrink-0 text-[12px] uppercase tracking-[.06em] text-muted">
                    {order.fulfilment}
                  </span>

                  <span className="w-[92px] shrink-0 text-right text-[14px] font-bold">
                    {formatINR(order.grand_total)}
                  </span>

                  {canEdit && to ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => advance(order, to)}
                      className="shrink-0 cursor-pointer rounded-pill border border-accent bg-accent px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-accent-ink disabled:opacity-60"
                    >
                      {TRANSITION_LABEL[to]}
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] uppercase tracking-[.08em] text-muted">
                      {to ? "Read-only" : "Done"}
                    </span>
                  )}
                </div>

                {expanded ? (
                  <div className="grid gap-4 border-t border-line bg-surface px-4 py-4 md:grid-cols-2">
                    <div>
                      <Label>Items</Label>
                      {lines.length === 0 ? (
                        <p className="m-0 text-[13px] text-muted">
                          No line items mirrored for this order.
                        </p>
                      ) : (
                        <ul className="m-0 grid list-none gap-1.5 p-0">
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
                      )}
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <Label>
                          {order.fulfilment === "pickup" ? "Collect from" : "Ship to"}
                        </Label>
                        <p className="m-0 text-[13px] leading-[1.6] text-muted">
                          {order.fulfilment === "pickup"
                            ? (order.location_slug ?? "—")
                            : order.shipping_address
                              ? [
                                  order.shipping_address.line1,
                                  order.shipping_address.line2,
                                  order.shipping_address.city,
                                  order.shipping_address.state,
                                  order.shipping_address.postal_code,
                                ]
                                  .filter(Boolean)
                                  .join(", ")
                              : "No address on file"}
                        </p>
                      </div>

                      <div>
                        <Label>Payment</Label>
                        <p className="m-0 text-[13px] leading-[1.6] text-muted">
                          {order.payment_gateway}
                          {order.payment_capture_id
                            ? ` · ${order.payment_capture_id}`
                            : ""}
                          {order.mgd_invoice_id ? ` · invoice ${order.mgd_invoice_id}` : ""}
                        </p>
                      </div>

                      {order.fulfilment === "courier" ? (
                        <div>
                          <Label>Shipment</Label>
                          {shipment ? (
                            <p className="m-0 text-[13px] leading-[1.6] text-muted">
                              {shipment.courier ?? "Courier"} ·{" "}
                              {shipment.awb ?? "no AWB yet"} · {shipment.status}
                              {shipment.tracking_url ? (
                                <>
                                  {" · "}
                                  <a
                                    href={shipment.tracking_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="border-b border-accent"
                                  >
                                    Track
                                  </a>
                                </>
                              ) : null}
                            </p>
                          ) : (
                            <p className="m-0 text-[13px] text-muted">
                              None yet — create one from Shipments.
                            </p>
                          )}
                        </div>
                      ) : null}

                      {order.oversold ? (
                        <p className="m-0 rounded-field border border-accent bg-accent-soft p-3 text-[12px] leading-[1.6]">
                          Stock ran out while this was being paid for. It is paid
                          and was not refunded — confirm availability with the
                          customer before dispatch.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: ShopOrderStatus }) {
  const tone = statusTone(status);
  return (
    <span
      className={`shrink-0 rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${
        tone === "accent"
          ? "bg-accent text-accent-ink"
          : tone === "done"
            ? "bg-surface2 text-muted"
            : "border border-accent text-text"
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-muted">
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-pill border border-line bg-transparent px-4 py-2 text-[12px] font-semibold text-text"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
