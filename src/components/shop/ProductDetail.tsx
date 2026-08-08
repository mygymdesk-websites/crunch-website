"use client";

import { useState } from "react";

import { useCart } from "@/components/providers/CartProvider";
import { useLocation } from "@/components/providers/LocationProvider";
import { QtyStepper } from "@/components/shop/CartDrawer";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { Badge, Heading } from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import type { MgdProduct } from "@/lib/mgd/types";
import {
  SHIPPING_FLAT_RATE,
  hasDiscount,
  isOutOfStock,
  stockLabel,
  stockTone,
} from "@/lib/shop";

/**
 * Product detail.
 *
 * No page for this exists in the Claude Design export (the shop cards link to
 * a `Product.dc.html` that was never drawn), so it is assembled from the
 * design system's documented patterns — the same badges, price and stock
 * treatments as the shop grid, in the two-column inner-page layout.
 *
 * `stockByLocation` is rendered when the API sends it (tenant-wide key), which
 * lets a visitor see the item is available at the other gym instead of hitting
 * a dead end — still without ever showing a count.
 */
export function ProductDetail({ product }: { product: MgdProduct }) {
  const { location } = useLocation();
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const out = isOutOfStock(product);
  const elsewhere = (product.stockByLocation ?? []).filter(
    (row) => row.stockStatus !== "out_of_stock",
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-12">
      <div className="overflow-hidden rounded-card border border-line">
        <div className="aspect-square">
          <CoverImage
            src={product.imageUrl}
            alt={product.name}
            placeholderLabel={`product shot — ${product.name.toLowerCase()}`}
            eager
          />
        </div>
      </div>

      <div>
        {product.brand ? (
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
            {product.brand}
          </div>
        ) : null}

        <Heading as="h1" size="sub" className="mb-2">
          {product.name}
        </Heading>

        {product.size ? (
          <div className="mb-5 text-[14px] text-muted">
            {product.size}
            {product.unit ? ` · ${product.unit}` : ""}
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap items-baseline gap-3">
          <span className="font-display text-[38px] font-semibold leading-none">
            {formatINR(product.price)}
          </span>
          {hasDiscount(product) ? (
            <span className="text-[15px] text-muted line-through">
              {formatINR(product.mrp!)}
            </span>
          ) : null}
          <Badge tone={stockTone(product.stockStatus) === "accent" ? "accent" : "muted"}>
            {stockLabel(product.stockStatus)}
          </Badge>
        </div>

        {product.description ? (
          <p className="m-0 mb-6 max-w-[52ch] text-[15px] leading-[1.7] text-muted">
            {product.description}
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <QtyStepper qty={qty} onChange={(next) => setQty(Math.max(1, next))} />
          <Button
            size="lg"
            disabled={out}
            onClick={() => add(product, qty)}
            className="flex-auto"
          >
            {out ? "Out of stock" : "Add to cart"}
          </Button>
        </div>

        {out && elsewhere.length > 0 ? (
          <p className="m-0 mb-4 text-[13px] text-muted">
            Out of stock at {location.short_name}, but available at{" "}
            {elsewhere.map((row) => row.locationName).join(" and ")} — switch
            location in the header to order it there.
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
          {product.sku ? (
            <div className="text-[12px] opacity-80">SKU {product.sku}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
