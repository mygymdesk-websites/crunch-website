"use client";

import { useId, useMemo, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import type { MgdProduct } from "@/lib/mgd/types";
import {
  PRICE_BANDS,
  SHIPPING_FLAT_RATE,
  brandsFrom,
  categoriesFrom,
  isOutOfStock,
  sizesFrom,
} from "@/lib/shop";
import { ProductCard } from "./ProductCard";

type Sort = "featured" | "low" | "high" | "name";

const ALL = "All";

/**
 * The shop grid and its filter rail.
 *
 * Filters are derived from the CATALOGUE THAT CAME BACK, not from a hardcoded
 * list — a new brand or category in MyGymDesk gets its own chip with no code
 * change, and a filter never offers a value that would return nothing.
 *
 * Filtering runs client-side because the API has no pagination or search
 * ("No pagination, no filtering beyond the documented params, no search"), so
 * the whole location catalogue arrives in one cached call regardless.
 * `in_stock_only` is applied here too, matching the API's own rule: it drops
 * only `out_of_stock`, leaving `low_stock` visible.
 */
export function ShopBrowser({ products }: { products: MgdProduct[] }) {
  const { location } = useLocation();
  const searchId = useId();
  const sortId = useId();

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [brand, setBrand] = useState<string>(ALL);
  const [size, setSize] = useState<string>(ALL);
  const [band, setBand] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = useMemo(() => categoriesFrom(products), [products]);
  const brands = useMemo(() => brandsFrom(products), [products]);
  const sizes = useMemo(() => sizesFrom(products), [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = products.filter((product) => {
      if (categoryId !== ALL && product.category?.id !== categoryId) return false;
      if (brand !== ALL && product.brand !== brand) return false;
      if (size !== ALL && product.size !== size) return false;
      if (band !== null) {
        const range = PRICE_BANDS[band];
        if (product.price < range.min || product.price > range.max) return false;
      }
      // Matches the API's rule: drops only out_of_stock.
      if (inStockOnly && isOutOfStock(product)) return false;
      if (q) {
        const haystack = [
          product.name,
          product.brand,
          product.size,
          product.category?.name,
          product.sku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    switch (sort) {
      case "low":
        return [...filtered].sort((a, b) => a.price - b.price);
      case "high":
        return [...filtered].sort((a, b) => b.price - a.price);
      case "name":
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      default:
        // "Featured" is the owner's display order, which is the order the API
        // already returned — preserve it rather than imposing our own.
        return filtered;
    }
  }, [products, query, categoryId, brand, size, band, inStockOnly, sort]);

  const activeFilters =
    (categoryId !== ALL ? 1 : 0) +
    (brand !== ALL ? 1 : 0) +
    (size !== ALL ? 1 : 0) +
    (band !== null ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  function clearFilters() {
    setCategoryId(ALL);
    setBrand(ALL);
    setSize(ALL);
    setBand(null);
    setInStockOnly(false);
    setQuery("");
  }

  return (
    <>
      <div className="mb-[22px] flex flex-wrap items-center gap-3">
        <label
          htmlFor={searchId}
          className="flex min-w-0 flex-[1_1_260px] items-center gap-2.5 rounded-pill border border-line bg-surface px-[18px] py-3"
        >
          <span aria-hidden="true" className="text-[14px] text-muted">
            ⌕
          </span>
          <span className="sr-only">Search products</span>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search whey, gloves, tee…"
            className="min-w-0 flex-auto border-0 bg-transparent text-[14px] text-text outline-none placeholder:text-muted"
          />
        </label>

        <label htmlFor={sortId} className="sr-only">
          Sort products
        </label>
        <select
          id={sortId}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="shrink-0 cursor-pointer rounded-pill border border-line bg-surface px-[18px] py-3 text-[13px] text-text"
        >
          <option value="featured">Sort: Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
          <option value="name">Name: A–Z</option>
        </select>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className="shrink-0 cursor-pointer rounded-pill border-0 bg-accent px-5 py-3 text-[12px] font-bold uppercase tracking-[.08em] text-accent-ink min-[1220px]:hidden"
        >
          Filters {activeFilters > 0 ? `(${activeFilters})` : ""}
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-[26px] min-[1220px]:grid-cols-[250px_1fr]">
        <aside
          className={`rounded-card border border-line bg-surface p-[22px] min-[1220px]:sticky min-[1220px]:top-[88px] min-[1220px]:block ${
            filtersOpen ? "block" : "hidden"
          }`}
        >
          <div className="mb-[18px] flex items-center justify-between gap-3">
            <span className="font-display text-[17px] font-semibold uppercase">
              Filters
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-bold uppercase tracking-[.08em] text-accent"
            >
              Clear
            </button>
          </div>

          {categories.length > 0 ? (
            <FilterGroup
              label="Category"
              options={[
                { value: ALL, label: ALL },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={categoryId}
              onChange={setCategoryId}
            />
          ) : null}

          {brands.length > 0 ? (
            <FilterGroup
              label="Brand"
              options={[ALL, ...brands].map((b) => ({ value: b, label: b }))}
              value={brand}
              onChange={setBrand}
            />
          ) : null}

          {sizes.length > 0 ? (
            <FilterGroup
              label="Size"
              options={[ALL, ...sizes].map((s) => ({ value: s, label: s }))}
              value={size}
              onChange={setSize}
              shape="square"
            />
          ) : null}

          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-muted">
            Price
          </div>
          <div className="mb-[22px] grid gap-[7px]">
            {PRICE_BANDS.map((range, index) => {
              const active = band === index;
              return (
                <button
                  key={range.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBand(active ? null : index)}
                  className={`cursor-pointer rounded-lg border px-[13px] py-[9px] text-left text-[12px] font-semibold ${
                    active
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-transparent text-text"
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            In stock at {location.short_name} only
          </label>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-muted" aria-live="polite">
              {visible.length} of {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </span>
            <span className="text-[12px] text-muted">
              Free pickup at {location.short_name} · Shipping{" "}
              {formatINR(SHIPPING_FLAT_RATE)}
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-card border border-dashed border-line px-6 py-14 text-center">
              <div className="mb-2 font-display text-[20px] font-semibold uppercase">
                Nothing matches those filters
              </div>
              <p className="m-0 mb-[18px] text-[14px] text-muted">
                Try a different category, or clear the filters and start again.
              </p>
              <Button size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
  shape = "pill",
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (next: string) => void;
  shape?: "pill" | "square";
}) {
  return (
    <>
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-muted">
        {label}
      </div>
      <div
        className="mb-[22px] flex flex-wrap gap-[7px]"
        role="group"
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`cursor-pointer border px-[13px] py-[7px] text-[12px] font-semibold ${
                shape === "pill" ? "rounded-pill" : "min-w-11 rounded-lg"
              } ${
                active
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-transparent text-text hover:border-accent"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Loading state for the shop grid. */
export function ShopSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="animate-[shimmer_1.4s_ease-in-out_infinite] overflow-hidden rounded-[12px] border border-line bg-surface"
        >
          <SkeletonBlock className="aspect-square" />
          <div className="p-4">
            <SkeletonBlock className="mb-2.5 h-[9px] w-2/5 rounded" />
            <SkeletonBlock className="mb-3.5 h-3 w-[85%] rounded" />
            <SkeletonBlock className="h-3 w-[35%] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
