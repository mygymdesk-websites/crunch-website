"use client";

import Link from "next/link";

import { useCart } from "@/components/providers/CartProvider";
import { Badge, StripedPlaceholder } from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import { productSlugById } from "@/lib/fixtures/products";
import type { MgdProduct } from "@/lib/mgd/types";

/** In stock · Only N left · Out of stock, from the location's stock count. */
export function stockState(stock: number) {
  if (stock <= 0) {
    return { label: "Out of Stock", tone: "muted" as const, out: true, low: false };
  }
  if (stock <= 3) {
    return {
      label: `Only ${stock} left`,
      tone: "accent" as const,
      out: false,
      low: true,
    };
  }
  return { label: "In Stock", tone: "muted" as const, out: false, low: false };
}

/**
 * A shop card.
 *
 * Stock is per-location: a tub on the shelf at one gym is not stock at the
 * other. Out-of-stock cards dim, flag "Sold out" and disable Add to cart
 * rather than letting someone buy air.
 *
 * Product photography uses the striped placeholder deliberately — MGD's
 * `website-products` (Track A · A1) is the source of `imageUrl` and it is not
 * live yet, so there is nothing real to show.
 */
export function ProductCard({ product }: { product: MgdProduct }) {
  const { add } = useCart();
  const state = stockState(product.stock);
  const slug = productSlugById(product.id);
  const href = slug ? `/shop/${slug}` : "/shop";

  const flag = state.out ? "Sold out" : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-[12px] border border-line bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-accent">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden"
        style={{ opacity: state.out ? 0.55 : 1 }}
      >
        <StripedPlaceholder
          label={`product shot — ${product.name.toLowerCase()}`}
        />
        {flag ? (
          <span className="absolute left-2.5 top-2.5">
            <Badge tone="dark">{flag}</Badge>
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
        {product.variant ? (
          <div className="mb-3 text-[12px] text-muted">{product.variant}</div>
        ) : null}

        <div className="mb-3 mt-auto flex items-center justify-between gap-2">
          <span className="flex items-baseline gap-2">
            <span className="text-[16px] font-bold">
              {formatINR(product.price)}
            </span>
            {product.listPrice && product.listPrice > product.price ? (
              <span className="text-[12px] text-muted line-through">
                {formatINR(product.listPrice)}
              </span>
            ) : null}
          </span>
          <span
            className={`text-[11px] font-semibold ${
              state.tone === "accent" ? "text-accent" : "text-muted"
            }`}
          >
            {state.label}
          </span>
        </div>

        <button
          type="button"
          disabled={state.out}
          onClick={() => add(product.id)}
          className={`w-full rounded-pill border px-4 py-[11px] text-[11px] font-bold uppercase tracking-[.08em] transition-[filter] ${
            state.out
              ? "cursor-not-allowed border-line bg-transparent text-muted"
              : "cursor-pointer border-accent bg-accent text-accent-ink hover:brightness-[1.08]"
          }`}
        >
          {state.out ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
