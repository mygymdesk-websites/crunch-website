"use client";

import Link from "next/link";

import { Heading, Section } from "@/components/ui/Primitives";
import { StripedPlaceholder } from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import { productSlugById } from "@/lib/fixtures/products";
import type { MgdProduct } from "@/lib/mgd/types";
import { stockState } from "./ProductCard";

/** "The counter, online" — the homepage's four-product shop teaser. */
export function ShopStrip({ products }: { products: MgdProduct[] }) {
  const shown = products.slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <Section band="surface2" className="mt-[76px]">
      <div className="reveal mx-auto w-full max-w-content px-5 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <Heading className="!text-[clamp(24px,3.4vw,38px)]">
            The counter, online
          </Heading>
          <Link
            href="/shop"
            className="border-b-2 border-accent pb-[3px] text-[13px] font-bold uppercase tracking-[.08em]"
          >
            Shop all →
          </Link>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
          {shown.map((product) => {
            const state = stockState(product.stock);
            const slug = productSlugById(product.id);
            return (
              <Link
                key={product.id}
                href={slug ? `/shop/${slug}` : "/shop"}
                className="overflow-hidden rounded-[12px] border border-line bg-surface transition-transform duration-300 hover:-translate-y-[3px]"
              >
                <div className="aspect-square overflow-hidden">
                  <StripedPlaceholder
                    label={`product shot — ${product.name.toLowerCase()}`}
                  />
                </div>
                <div className="p-4">
                  {product.brand ? (
                    <div className="mb-[5px] text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                      {product.brand}
                    </div>
                  ) : null}
                  <div className="mb-2.5 text-[14px] font-semibold leading-[1.35]">
                    {product.name}
                    {product.variant ? ` — ${product.variant}` : ""}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">
                      {formatINR(product.price)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        state.tone === "accent" ? "text-accent" : "text-muted"
                      }`}
                    >
                      {state.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
