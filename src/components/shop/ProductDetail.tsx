"use client";

import { useState } from "react";

import { useCart } from "@/components/providers/CartProvider";
import { useLocation } from "@/components/providers/LocationProvider";
import { QtyStepper } from "@/components/shop/CartDrawer";
import { Button } from "@/components/ui/Button";
import { Badge, Heading, StripedPlaceholder } from "@/components/ui/Primitives";
import { SHIPPING_FLAT_RATE, type ProductFixture } from "@/lib/fixtures/products";
import { formatINR } from "@/lib/format";
import { stockState } from "./ProductCard";

/**
 * Product detail.
 *
 * No page for this exists in the Claude Design export (the shop cards link to
 * a `Product.dc.html` that was never drawn), so this is assembled strictly
 * from the design system's documented patterns — the same card, badge, price
 * and stock treatments used on the shop grid, in the two-column layout the
 * other inner pages use. Nothing new was invented visually.
 */
export function ProductDetail({ product }: { product: ProductFixture }) {
  const { location } = useLocation();
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const stock = product.stockBySlug[location.slug] ?? 0;
  const state = stockState(stock);
  const otherLocations = Object.entries(product.stockBySlug).filter(
    ([slug, count]) => slug !== location.slug && count > 0,
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-12">
      <div className="overflow-hidden rounded-card border border-line">
        <div className="aspect-square">
          <StripedPlaceholder
            label={`product shot — ${product.name.toLowerCase()}`}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
          {product.brand}
        </div>
        <Heading as="h1" size="sub" className="mb-2">
          {product.name}
        </Heading>
        <div className="mb-5 text-[14px] text-muted">{product.variant}</div>

        <div className="mb-5 flex flex-wrap items-baseline gap-3">
          <span className="font-display text-[38px] font-semibold leading-none">
            {formatINR(product.price)}
          </span>
          {product.listPrice && product.listPrice > product.price ? (
            <span className="text-[15px] text-muted line-through">
              {formatINR(product.listPrice)}
            </span>
          ) : null}
          <Badge tone={state.out ? "muted" : state.low ? "accent" : "muted"}>
            {state.label}
          </Badge>
        </div>

        <p className="m-0 mb-5 max-w-[52ch] text-[15px] leading-[1.7] text-muted">
          {product.description}
        </p>

        <ul className="m-0 mb-7 grid list-none gap-2.5 p-0 text-[14px] text-muted">
          {product.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-[9px]">
              <span aria-hidden="true" className="shrink-0 text-accent">
                ✓
              </span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <QtyStepper qty={qty} onChange={(next) => setQty(Math.max(1, next))} />
          <Button
            size="lg"
            disabled={state.out}
            onClick={() => add(product.id, qty)}
            className="flex-auto"
          >
            {state.out ? "Out of stock" : "Add to cart"}
          </Button>
        </div>

        {state.out && otherLocations.length > 0 ? (
          <p className="m-0 mb-4 text-[13px] text-muted">
            Out of stock at {location.short_name}, but available at our other
            gym — switch location in the header to order it there.
          </p>
        ) : null}

        <div className="grid gap-2.5 rounded-[12px] border border-line bg-surface2 p-4 text-[13px] leading-[1.6] text-muted">
          <div>
            <b className="text-text">Free pickup</b> at the{" "}
            {location.short_name} desk, ready within 24 hours.
          </div>
          <div>
            <b className="text-text">Shipping {formatINR(SHIPPING_FLAT_RATE)}</b>{" "}
            flat across India via Shiprocket, 3–5 working days.
          </div>
          <div>
            Sealed goods. Returns accepted within 7 days where the seal is
            intact — see the Refund Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
