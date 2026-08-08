"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useCart } from "@/components/providers/CartProvider";
import { useLocation } from "@/components/providers/LocationProvider";
import { StripedPlaceholder } from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import { GST_RATE } from "@/lib/fixtures/products";

/**
 * The slide-in cart, per the Shop design: a 420px panel pinned to the right,
 * scrolling line items, and a fixed totals footer.
 *
 * The GST line here is a DISPLAY estimate. Phase 5 sends the cart to
 * MyGymDesk, which resolves every price, tax and stock check server-side —
 * a client-computed total is never an input to a payment.
 */
export function CartDrawer() {
  const { isOpen, closeCart, resolve, setQty, remove } = useCart();
  const { location } = useLocation();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const lines = resolve(location.slug);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const gst = Math.round(subtotal * GST_RATE);

  return (
    <div
      className="fixed inset-0 z-[220] flex justify-end bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeCart();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="flex h-full w-[min(420px,100%)] flex-col border-l border-line bg-surface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-5">
          <span className="font-display text-[20px] font-semibold uppercase">
            Your cart
          </span>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="h-8 w-8 cursor-pointer rounded-full border border-line bg-transparent text-text transition-colors hover:border-accent"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="grid flex-auto content-start gap-3.5 overflow-y-auto p-5">
          {lines.length === 0 ? (
            <div className="py-[60px] text-center">
              <div className="mb-2 font-display text-[18px] font-semibold uppercase">
                Your cart is empty
              </div>
              <p className="m-0 text-[13px] text-muted">
                Add something from the shop to get started.
              </p>
            </div>
          ) : (
            lines.map((line) => (
              <div key={line.productId} className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                  <StripedPlaceholder
                    label={line.product.name.toLowerCase()}
                    className="!px-0"
                  />
                </div>
                <div className="min-w-0 flex-auto">
                  <div className="text-[13px] font-semibold leading-[1.35]">
                    {line.product.name}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {line.product.variant}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <QtyStepper
                      qty={line.qty}
                      onChange={(next) => setQty(line.productId, next)}
                    />
                    <button
                      type="button"
                      onClick={() => remove(line.productId)}
                      className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[.06em] text-muted transition-colors hover:text-accent"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-[14px] font-bold">
                  {formatINR(line.lineTotal)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid gap-2.5 border-t border-line p-5">
          <div className="flex justify-between text-[13px] text-muted">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-muted">
            <span>GST (18%)</span>
            <span>{formatINR(gst)}</span>
          </div>
          <div className="flex justify-between text-[17px] font-bold">
            <span>Total</span>
            <span>{formatINR(subtotal + gst)}</span>
          </div>
          {lines.length > 0 ? (
            <Link
              href="/checkout"
              onClick={closeCart}
              className="mt-1.5 rounded-pill bg-accent px-5 py-[15px] text-center text-[13px] font-bold uppercase tracking-[.08em] text-accent-ink transition-[filter] hover:text-accent-ink hover:brightness-[1.08]"
            >
              Checkout
            </Link>
          ) : (
            <Link
              href="/shop"
              onClick={closeCart}
              className="mt-1.5 rounded-pill border border-line px-5 py-[15px] text-center text-[13px] font-bold uppercase tracking-[.08em] transition-colors hover:border-accent"
            >
              Browse the shop
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

export function QtyStepper({
  qty,
  onChange,
  max = 10,
}: {
  qty: number;
  onChange: (next: number) => void;
  max?: number;
}) {
  return (
    <span className="flex shrink-0 items-center overflow-hidden rounded-pill border border-line">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        aria-label="Decrease quantity"
        className="h-[30px] w-[30px] cursor-pointer border-0 bg-transparent text-[16px] text-text transition-colors hover:bg-surface2"
      >
        <span aria-hidden="true">−</span>
      </button>
      <span className="min-w-[26px] text-center text-[13px] font-bold" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(qty + 1, max))}
        disabled={qty >= max}
        aria-label="Increase quantity"
        className="h-[30px] w-[30px] cursor-pointer border-0 bg-transparent text-[16px] text-text transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">+</span>
      </button>
    </span>
  );
}
