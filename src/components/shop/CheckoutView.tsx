"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { useCart } from "@/components/providers/CartProvider";
import { useLocation } from "@/components/providers/LocationProvider";
import { QtyStepper } from "@/components/shop/CartDrawer";
import { ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { CoverImage } from "@/components/ui/CoverImage";
import { INDIAN_STATES } from "@/lib/fixtures/site-content";
import { formatINR } from "@/lib/format";
import { formatAddress } from "@/lib/location-format";
import type { MgdProduct } from "@/lib/mgd/types";
import { GST_RATE, SHIPPING_FLAT_RATE, stockLabel } from "@/lib/shop";

type Fulfilment = "pickup" | "courier";

/**
 * Cart + checkout, as one screen (the design draws them that way: line items,
 * fulfilment choice and address on the left, a sticky summary on the right).
 *
 * PHASE 1: the pay button is disabled with honest "launching soon" copy.
 * Nothing here can take money, and pretending otherwise would be the worst
 * possible bug to ship. Phase 5 replaces the disabled button with the
 * MyGymDesk shop-order flow:
 *
 *   website-shop-order-create → Razorpay Checkout → website-shop-order
 *   → mirror into shop_orders → (courier) push to Shiprocket
 *
 * Every total below is a DISPLAY estimate. At Phase 5 the server re-resolves
 * price, stock and GST from MyGymDesk; a client-computed figure is never an
 * input to a payment.
 */
export function CheckoutView({ products }: { products: MgdProduct[] }) {
  const { location } = useLocation();
  const { lines, setQty, remove, hydrated } = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const fieldId = useId();

  // Live stock for the selected branch, supplied by the server. The cart holds
  // a snapshot (it renders on every page and cannot call MyGymDesk), so stock
  // is reconciled here against the real catalogue rather than trusted from it.
  const liveById = new Map(products.map((p) => [p.id, p]));

  if (!hydrated) {
    return (
      <div className="py-20 text-center text-[14px] text-muted">
        Loading your cart…
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-line px-6 py-[70px] text-center">
        <div className="mb-2.5 font-display text-[24px] font-semibold uppercase">
          Your cart is empty
        </div>
        <p className="m-0 mb-[22px] text-[14px] text-muted">
          Nothing to check out yet. The shop has supplements, apparel and gear
          stocked at {location.short_name}.
        </p>
        <ButtonLink href="/shop" size="sm">
          Back to shop
        </ButtonLink>
      </div>
    );
  }

  const isShip = fulfilment === "courier";
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.snapshot.price * line.qty,
    0,
  );
  const shipping = isShip ? SHIPPING_FLAT_RATE : 0;
  const taxable = subtotal + shipping;
  const gst = Math.round(taxable * GST_RATE);
  const total = taxable + gst;

  return (
    <div className="grid grid-cols-1 items-start gap-[26px] min-[1220px]:grid-cols-[1fr_350px]">
      <div className="grid gap-[18px]">
        <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-[22px] py-[18px]">
            <span className="font-display text-[19px] font-semibold uppercase">
              Your items
            </span>
            <Link
              href="/shop"
              className="text-[11px] font-bold uppercase tracking-[.08em] text-accent"
            >
              Add more
            </Link>
          </div>

          {lines.map((line) => {
            const live = liveById.get(line.productId);
            // Exact quantities are never exposed by the API, so the note can
            // only ever be the tri-state status — no "only N left".
            const note = !live
              ? "No longer available"
              : live.stockStatus === "out_of_stock"
                ? `Out of stock at ${location.short_name}`
                : stockLabel(live.stockStatus);
            const flagged =
              !live || live.stockStatus !== "in_stock";

            return (
              <div
                key={line.productId}
                className="flex flex-wrap items-center gap-4 border-b border-line px-[22px] py-[18px] last:border-b-0"
              >
                <span className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[10px]">
                  <CoverImage
                    src={line.snapshot.imageUrl}
                    alt={line.snapshot.name}
                    placeholderLabel={line.snapshot.name.toLowerCase()}
                  />
                </span>

                <span className="min-w-0 flex-[1_1_180px]">
                  {line.snapshot.brand ? (
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                      {line.snapshot.brand}
                    </span>
                  ) : null}
                  <span className="block text-[15px] font-semibold leading-[1.35]">
                    {line.snapshot.name}
                  </span>
                  <span className="mt-[3px] block text-[12px] text-muted">
                    {line.snapshot.size ? `${line.snapshot.size} · ` : ""}
                    {formatINR(line.snapshot.price)} each
                  </span>
                  <span
                    className={`mt-[5px] block text-[11px] font-semibold ${
                      flagged ? "text-accent" : "text-muted"
                    }`}
                  >
                    {note}
                  </span>
                </span>

                <QtyStepper
                  qty={line.qty}
                  onChange={(next) => setQty(line.productId, next)}
                />

                <span className="min-w-[88px] shrink-0 text-right">
                  <span className="block text-[16px] font-bold">
                    {formatINR(line.snapshot.price * line.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    className="cursor-pointer border-0 bg-transparent px-0 pt-1 text-[11px] font-semibold uppercase tracking-[.06em] text-muted transition-colors hover:text-accent"
                  >
                    Remove
                  </button>
                </span>
              </div>
            );
          })}
        </div>

        <div className="rounded-[16px] border border-line bg-surface p-[22px]">
          <div className="mb-4 font-display text-[19px] font-semibold uppercase">
            How would you like it?
          </div>
          <div
            className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3"
            role="radiogroup"
            aria-label="Fulfilment method"
          >
            <FulfilmentOption
              selected={!isShip}
              onSelect={() => setFulfilment("pickup")}
              title="Pick up at the gym"
              price="Free"
              priceAccent
              detail={`Ready at the ${location.short_name} desk within 24 hours.`}
            />
            <FulfilmentOption
              selected={isShip}
              onSelect={() => setFulfilment("courier")}
              title="Ship to me"
              price={formatINR(SHIPPING_FLAT_RATE)}
              detail="Shiprocket, 3–5 working days anywhere in India."
            />
          </div>
        </div>

        <div className="rounded-[16px] border border-line bg-surface p-[22px]">
          <div className="mb-4 font-display text-[19px] font-semibold uppercase">
            {isShip ? "Delivery address" : "Your details"}
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <Input
                id={`${fieldId}-name`}
                label="Full name"
                placeholder="Full name"
                autoComplete="name"
              />
              <Input
                id={`${fieldId}-phone`}
                label="Mobile number"
                placeholder="+91 XXXXX XXXXX"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <Input
              id={`${fieldId}-email`}
              label="Email address for the GST invoice"
              placeholder="Email address (for the GST invoice)"
              type="email"
              autoComplete="email"
            />

            {isShip ? (
              <div className="grid gap-3">
                <Input
                  id={`${fieldId}-line1`}
                  label="Flat / house number, building"
                  placeholder="Flat / house no., building"
                  autoComplete="address-line1"
                />
                <Input
                  id={`${fieldId}-line2`}
                  label="Street, area, landmark"
                  placeholder="Street, area, landmark"
                  autoComplete="address-line2"
                />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                  <Input
                    id={`${fieldId}-city`}
                    label="City"
                    placeholder="City"
                    autoComplete="address-level2"
                  />
                  <Select
                    id={`${fieldId}-state`}
                    label="State"
                    defaultValue=""
                    autoComplete="address-level1"
                  >
                    <option value="">State</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state}>{state}</option>
                    ))}
                  </Select>
                  <Input
                    id={`${fieldId}-pin`}
                    label="PIN code"
                    placeholder="PIN code"
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-field border border-line bg-bg p-4 text-[13px] leading-[1.65] text-muted">
                <b className="text-text">{location.name}</b>
                <br />
                {formatAddress(location)}
                <br />
                {location.hours_summary} · Collect within 24 hours, carry a
                photo ID.
              </div>
            )}

            <Input
              id={`${fieldId}-gstin`}
              label="GSTIN for company invoices"
              placeholder="GSTIN (optional, for company invoices)"
            />
          </div>
        </div>
      </div>

      <aside className="rounded-[16px] border border-line bg-surface p-6 min-[1220px]:sticky min-[1220px]:top-[88px]">
        <div className="mb-[18px] font-display text-[19px] font-semibold uppercase">
          Order summary
        </div>

        <div className="grid gap-[11px] border-b border-line pb-4">
          <SummaryRow
            label={`Subtotal (${count} item${count === 1 ? "" : "s"})`}
            value={formatINR(subtotal)}
          />
          <SummaryRow
            label={isShip ? "Shipping (Shiprocket)" : "Pickup at gym"}
            value={isShip ? formatINR(SHIPPING_FLAT_RATE) : "Free"}
            accent={!isShip}
          />
          <SummaryRow label="GST (18%)" value={formatINR(gst)} />
        </div>

        <div className="flex justify-between gap-3 py-4 text-[20px] font-bold">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>

        <button
          type="button"
          disabled
          title="Online payment launches in Phase 5"
          className="w-full cursor-not-allowed rounded-pill border-0 bg-accent px-5 py-4 text-[13px] font-bold uppercase tracking-[.08em] text-accent-ink opacity-55"
        >
          Pay {formatINR(total)} — launching soon
        </button>

        <p className="m-0 mt-3.5 text-center text-[12px] leading-[1.6] text-muted">
          Online shop payment isn&rsquo;t live yet. Call the{" "}
          {location.short_name} desk on{" "}
          <a href={`tel:${location.phone}`} className="border-b border-line">
            {location.phone}
          </a>{" "}
          and we&rsquo;ll hold these for you at the counter.
        </p>

        <p className="m-0 mt-3 text-center text-[11px] leading-[1.6] text-muted">
          When it launches: UPI, cards and netbanking via Razorpay, GST invoice
          emailed after payment. See our{" "}
          <Link href="/policies/refund" className="border-b border-line">
            Refund Policy
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}

function FulfilmentOption({
  selected,
  onSelect,
  title,
  price,
  detail,
  priceAccent = false,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  detail: string;
  priceAccent?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`cursor-pointer rounded-[12px] p-[18px] text-left text-text ${
        selected
          ? "border-2 border-accent bg-accent-soft"
          : "border border-line bg-bg"
      }`}
    >
      <span className="mb-[7px] flex items-center justify-between gap-2.5">
        <span className="text-[15px] font-bold">{title}</span>
        <span
          className={`text-[13px] font-bold ${priceAccent ? "text-accent" : ""}`}
        >
          {price}
        </span>
      </span>
      <span className="block text-[13px] leading-[1.55] text-muted">
        {detail}
      </span>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-[14px]">
      <span className="text-muted">{label}</span>
      <span className={accent ? "text-accent" : undefined}>{value}</span>
    </div>
  );
}
