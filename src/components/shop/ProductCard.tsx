"use client";

import Link from "next/link";

import { useCart } from "@/components/providers/CartProvider";
import { CoverImage } from "@/components/ui/CoverImage";
import { Badge } from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import type { MgdProduct } from "@/lib/mgd/types";
import {
  hasDiscount,
  isOutOfStock,
  productSlug,
  stockLabel,
  stockTone,
} from "@/lib/shop";

/**
 * A shop card, from a live `website-products` row.
 *
 * Three contract rules the design has to bend to:
 *   - stock is TRI-STATE and counts are never exposed, so there is no
 *     "only 3 left" — `low_stock` renders as an accent "Low stock";
 *   - `price` is the all-in charged amount, displayed as-is;
 *   - `mrp` is omitted unless it is above `price`, so the strike-through is
 *     conditional on presence, never on a comparison against a default.
 */
export function ProductCard({ product }: { product: MgdProduct }) {
  const { add } = useCart();
  const out = isOutOfStock(product);
  const href = `/shop/${productSlug(product)}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-[12px] border border-line bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-accent">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden"
        style={{ opacity: out ? 0.55 : 1 }}
      >
        <CoverImage
          src={product.imageUrl}
          alt={product.name}
          placeholderLabel={`product shot — ${product.name.toLowerCase()}`}
        />
        {out ? (
          <span className="absolute left-2.5 top-2.5">
            <Badge tone="dark">Sold out</Badge>
          </span>
        ) : null}
      </Link>

      <div className="flex flex-auto flex-col p-4">
        {product.brand ? (
          <div className="mb-[5px] text-[10px] font-bold uppercase tracking-[.12em] text-muted">
            {product.brand}
          </div>
        ) : null}

        <Link
          href={href}
          className="mb-1 text-[14px] font-semibold leading-[1.35]"
        >
          {product.name}
        </Link>

        {product.size ? (
          <div className="mb-3 text-[12px] text-muted">{product.size}</div>
        ) : null}

        <div className="mb-3 mt-auto flex items-center justify-between gap-2">
          <span className="flex items-baseline gap-2">
            <span className="text-[16px] font-bold">
              {formatINR(product.price)}
            </span>
            {hasDiscount(product) ? (
              <span className="text-[12px] text-muted line-through">
                {formatINR(product.mrp!)}
              </span>
            ) : null}
          </span>
          <span
            className={`text-[11px] font-semibold ${
              stockTone(product.stockStatus) === "accent"
                ? "text-accent"
                : "text-muted"
            }`}
          >
            {stockLabel(product.stockStatus)}
          </span>
        </div>

        <button
          type="button"
          disabled={out}
          onClick={() => add(product)}
          className={`w-full rounded-pill border px-4 py-[11px] text-[11px] font-bold uppercase tracking-[.08em] transition-[filter] ${
            out
              ? "cursor-not-allowed border-line bg-transparent text-muted"
              : "cursor-pointer border-accent bg-accent text-accent-ink hover:brightness-[1.08]"
          }`}
        >
          {out ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
