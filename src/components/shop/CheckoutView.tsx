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
import { formatINR, isValidEmail, isValidIndianMobile } from "@/lib/format";
import { formatAddress } from "@/lib/location-format";
import type { MgdProduct } from "@/lib/mgd/types";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { stockLabel } from "@/lib/shop";

type Fulfilment = "pickup" | "courier";

/**
 * Cart + checkout, as one screen (the design draws them that way: line items,
 * fulfilment choice and address on the left, a sticky summary on the right).
 *
 * The flow:
 *   website-shop-order-create → Razorpay Checkout → website-shop-order
 *   → mirror into shop_orders → (courier) Shiprocket, from admin
 *
 * TOTALS. Product prices from the catalogue are ALL-IN — tax already handled —
 * and the order endpoint charges exactly the sum of those lines. So this screen
 * adds nothing on top: no client-computed GST, no shipping line. The number
 * shown is the number charged, which is the only invariant worth protecting on
 * a checkout. (Delivery is arranged after the order because the API has no
 * concept of it; see the note by the fulfilment choice.)
 *
 * The displayed subtotal is still only a display: the server re-resolves every
 * price, and a client figure is never an input to a payment.
 */
export function CheckoutView({ products }: { products: MgdProduct[] }) {
  const { location } = useLocation();
  const { lines, setQty, remove, clear, hydrated } = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const fieldId = useId();

  const [values, setValues] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pin: "",
  });
  const set = (key: keyof typeof values) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const [phase, setPhase] = useState<
    "idle" | "working" | "gateway_offline" | "done"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  /** From 409 insufficient_stock — names the offending line and its ceiling. */
  const [shortfall, setShortfall] = useState<{
    productId: string;
    available: number;
  } | null>(null);
  const [receipt, setReceipt] = useState<{
    orderNumber: string;
    invoiceNumber: string | null;
    amountCharged: number;
    oversold: boolean;
    pickupLocationName: string | null;
  } | null>(null);
  const [testMode, setTestMode] = useState(false);

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

  // These come BEFORE the empty-cart check on purpose: a successful order
  // clears the cart, and showing "nothing to check out" to someone who just
  // paid would be the worst possible ending.
  if (phase === "done" && receipt) {
    return (
      <div className="mx-auto max-w-[560px] rounded-[16px] border border-line bg-surface p-8 text-center">
        {testMode ? (
          <div className="mb-4 inline-block rounded-pill border border-accent bg-accent-soft px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em]">
            Test mode — no real money moved
          </div>
        ) : null}
        <div className="mb-2 font-display text-[26px] font-semibold uppercase">
          Order placed
        </div>
        <p className="m-0 text-[14px] leading-[1.6] text-muted">
          Order <b className="text-text">{receipt.orderNumber}</b> ·{" "}
          {formatINR(receipt.amountCharged)} paid.
          {receipt.invoiceNumber
            ? ` GST invoice ${receipt.invoiceNumber} is on its way to your email.`
            : " Your GST invoice is on its way to your email."}
        </p>

        {receipt.oversold ? (
          <div className="mt-5 rounded-field border border-accent bg-accent-soft p-4 text-left text-[13px] leading-[1.65]">
            <b>We&rsquo;ll confirm availability before dispatch.</b>
            <br />
            One of these went out of stock as you were paying. Your payment is
            safe and the {receipt.pickupLocationName ?? location.short_name} team
            will call you to sort it — nothing further is needed from you.
          </div>
        ) : null}

        <p className="mt-5 text-[13px] leading-[1.6] text-muted">
          {fulfilment === "pickup"
            ? `Collect from ${receipt.pickupLocationName ?? location.short_name} — we'll message you when it's bagged and ready.`
            : "We'll confirm the courier and tracking as soon as it's packed."}
        </p>

        <ButtonLink href="/account" className="mt-6" block>
          View my orders
        </ButtonLink>
      </div>
    );
  }

  if (phase === "gateway_offline") {
    return (
      <div className="mx-auto max-w-[560px] rounded-[16px] border border-line bg-surface p-8">
        <div className="mb-2 font-display text-[24px] font-semibold uppercase">
          Paying online is launching soon
        </div>
        <p className="m-0 text-[14px] leading-[1.6] text-muted">
          We can&rsquo;t take card payments on the site just yet. Call{" "}
          {location.short_name} and the desk will hold these at the counter —
          UPI or card there, with the GST invoice the same minute.
        </p>
        <div className="mt-5 rounded-field border border-accent bg-accent-soft p-4">
          <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">
            Call {location.short_name}
          </div>
          <a
            href={`tel:${location.phone}`}
            className="mt-1 block font-display text-[24px] font-semibold text-text"
          >
            {location.phone}
          </a>
        </div>
        <p className="mt-4 text-[12px] leading-[1.6] text-muted">
          Nothing has been charged and your cart is untouched.
        </p>
        <button
          type="button"
          onClick={() => setPhase("idle")}
          className="mt-5 w-full cursor-pointer rounded-pill border border-line bg-transparent px-5 py-3 text-[12px] font-bold uppercase tracking-[.08em]"
        >
          Back to checkout
        </button>
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
  // The charged total IS the line sum: catalogue prices are all-in, and the
  // order endpoint computes from those same figures. Adding a GST line or a
  // shipping fee here would print a number the gateway never asks for.
  const total = subtotal;

  async function pay() {
    setError(null);
    setShortfall(null);

    if (values.name.trim().length < 2) return setError("Enter your full name.");
    if (!isValidIndianMobile(values.phone))
      return setError("Enter a valid 10-digit mobile number.");
    if (!isValidEmail(values.email))
      return setError("Enter a valid email address.");
    if (isShip && (!values.line1.trim() || !values.city.trim() || !values.pin.trim()))
      return setError("Enter your delivery address, city and PIN code.");

    setPhase("working");

    const items = lines.map((line) => ({
      productId: line.productId,
      quantity: line.qty,
      name: line.snapshot.name,
      unitPrice: line.snapshot.price,
      brand: line.snapshot.brand ?? null,
      imageUrl: line.snapshot.imageUrl ?? null,
    }));

    try {
      const res = await fetch("/api/shop/order-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          name: values.name,
          phone: values.phone,
          email: values.email,
          locationSlug: location.slug,
        }),
      });
      const order = await res.json();

      if (!res.ok || !order.ok) {
        if (
          order?.error === "gateway_not_configured" ||
          order?.error === "gateway_reconnect_required" ||
          order?.error === "plan_upgrade_required"
        ) {
          setPhase("gateway_offline");
          return;
        }
        // Stock moved under us. Name the line and its ceiling so the customer
        // can fix the one that is short instead of guessing.
        if (order?.error === "insufficient_stock" && order?.productId) {
          setShortfall({
            productId: order.productId,
            available: Number(order.available ?? 0),
          });
        }
        setError(order?.message ?? "We couldn't start the payment.");
        setPhase("idle");
        return;
      }

      setTestMode(Boolean(order.testMode));

      const capture = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.razorpayOrderId,
        amount: order.amountInPaise, // paise — NOT order.amount, which is rupees
        currency: order.currency,
        name: location.name,
        description: `Shop order ${order.orderNumber}`,
        customer: { name: values.name, phone: values.phone, email: values.email },
      });

      const confirm = () =>
        fetch("/api/shop/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            payment: {
              orderId: capture.razorpay_order_id,
              captureId: capture.razorpay_payment_id,
              signature: capture.razorpay_signature,
            },
            fulfilment,
            locationSlug: location.slug,
            name: values.name,
            phone: values.phone,
            email: values.email,
            gstin: values.gstin || undefined,
            address: isShip
              ? {
                  line1: values.line1,
                  line2: values.line2,
                  city: values.city,
                  state: values.state,
                  postalCode: values.pin,
                }
              : undefined,
            items,
          }),
        });

      // Idempotent upstream, so a transport drop after capture is recoverable
      // by simply asking again rather than stranding a paid order.
      let confirmRes: Response;
      try {
        confirmRes = await confirm();
      } catch {
        confirmRes = await confirm();
      }
      const result = await confirmRes.json();

      if (!confirmRes.ok || !result.ok) {
        setError(
          result?.message ??
            "Your payment went through but we couldn't confirm the order. " +
              "Please call the gym — do not pay again.",
        );
        setPhase("idle");
        return;
      }

      setReceipt(result);
      clear();
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The payment did not complete.");
      setPhase("idle");
    }
  }

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

                <span className="grid gap-1.5">
                  <QtyStepper
                    qty={line.qty}
                    onChange={(next) => setQty(line.productId, next)}
                  />
                  {/* The gym ran short between adding and paying. Correcting it
                      in place beats a generic error that makes the customer
                      guess which of six lines is the problem. */}
                  {shortfall?.productId === line.productId ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (shortfall.available > 0) {
                          setQty(line.productId, shortfall.available);
                        } else {
                          remove(line.productId);
                        }
                        setShortfall(null);
                        setError(null);
                      }}
                      className="cursor-pointer rounded-field border border-accent bg-accent-soft px-2 py-1 text-[10px] font-bold uppercase tracking-[.06em]"
                    >
                      {shortfall.available > 0
                        ? `Only ${shortfall.available} left — set to ${shortfall.available}`
                        : "Sold out — remove"}
                    </button>
                  ) : null}
                </span>

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
              price="Quoted after"
              // The API charges product lines only — it has no delivery
              // concept — so a courier fee cannot be collected on this rail.
              // Saying so beats printing a number nobody will be charged.
              detail="We'll confirm the courier and any charge before dispatch."
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
                value={values.name}
                onChange={(e) => set("name")(e.target.value)}
              />
              <Input
                id={`${fieldId}-phone`}
                label="Mobile number"
                placeholder="+91 XXXXX XXXXX"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(e) => set("phone")(e.target.value)}
              />
            </div>
            <Input
              id={`${fieldId}-email`}
              label="Email address for the GST invoice"
              placeholder="Email address (for the GST invoice)"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => set("email")(e.target.value)}
            />

            {isShip ? (
              <div className="grid gap-3">
                <Input
                  id={`${fieldId}-line1`}
                  label="Flat / house number, building"
                  placeholder="Flat / house no., building"
                  autoComplete="address-line1"
                  value={values.line1}
                  onChange={(e) => set("line1")(e.target.value)}
                />
                <Input
                  id={`${fieldId}-line2`}
                  label="Street, area, landmark"
                  placeholder="Street, area, landmark"
                  autoComplete="address-line2"
                  value={values.line2}
                  onChange={(e) => set("line2")(e.target.value)}
                />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                  <Input
                    id={`${fieldId}-city`}
                    label="City"
                    placeholder="City"
                    autoComplete="address-level2"
                    value={values.city}
                    onChange={(e) => set("city")(e.target.value)}
                  />
                  <Select
                    id={`${fieldId}-state`}
                    label="State"
                    autoComplete="address-level1"
                    value={values.state}
                    onChange={(e) => set("state")(e.target.value)}
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
                    value={values.pin}
                    onChange={(e) => set("pin")(e.target.value)}
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
              value={values.gstin}
              onChange={(e) => set("gstin")(e.target.value)}
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
            label={isShip ? "Delivery" : "Pickup at gym"}
            value={isShip ? "Arranged after checkout" : "Free"}
            accent={!isShip}
          />
          <SummaryRow label="GST" value="Included" />
        </div>

        <div className="flex justify-between gap-3 py-4 text-[20px] font-bold">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>

        {testMode ? (
          <div className="mb-3 rounded-pill border border-accent bg-accent-soft px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[.08em]">
            Test mode — no real money moved
          </div>
        ) : null}

        <button
          type="button"
          onClick={pay}
          disabled={phase === "working"}
          className="w-full cursor-pointer rounded-pill border-0 bg-accent px-5 py-4 text-[13px] font-bold uppercase tracking-[.08em] text-accent-ink transition-[filter] hover:brightness-[1.08] disabled:cursor-wait disabled:opacity-60"
        >
          {phase === "working" ? "Working…" : `Pay ${formatINR(total)}`}
        </button>

        {error ? (
          <p className="m-0 mt-3.5 text-[13px] leading-[1.6] text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <p className="m-0 mt-3.5 text-center text-[12px] leading-[1.6] text-muted">
          UPI, cards and netbanking via Razorpay. Your GST invoice is emailed
          after payment. See our{" "}
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
