import type { MgdProduct, StockStatus } from "@/lib/mgd/types";

/**
 * Website-side shop constants and helpers.
 *
 * Everything about a PRODUCT now comes from `GET /website-products`. What
 * lives here is what the API does not own: the website's shipping rate, the
 * GST rate used for the display estimate, and how a product becomes a URL.
 */

/** Flat shipping rate quoted on the shop and checkout. Website-side policy. */
export const SHIPPING_FLAT_RATE = 79;

/**
 * GST for the checkout DISPLAY estimate only.
 *
 * `product.price` from the API is already the all-in charged amount with tax
 * handling included, so this is never applied to a product price. It exists
 * for the order-total estimate the design draws, and Phase 5 replaces the
 * whole total with MyGymDesk's server-resolved figure anyway.
 */
export const GST_RATE = 0.18;

/**
 * A stable, readable URL for a product.
 *
 * MyGymDesk has no slug field, and there is no variant engine — a size run is
 * separate products, so name alone is not unique ("Training Tee" in M and L).
 * Name + size + a short id suffix is readable and collision-proof without
 * having to scan the catalogue for clashes.
 */
export function productSlug(product: MgdProduct): string {
  const base = [product.name, product.size]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");

  return `${base}-${product.id.replace(/-/g, "").slice(0, 8)}`;
}

/** Resolve a slug back to a product. */
export function findProductBySlug(
  products: MgdProduct[],
  slug: string,
): MgdProduct | undefined {
  return products.find((p) => productSlug(p) === slug);
}

/**
 * Copy for the tri-state stock status.
 *
 * The API deliberately never exposes counts, so there is no "only 3 left"
 * here — that number would be invented. `low_stock` is the accent-coloured
 * nudge the design uses for scarcity.
 */
export function stockLabel(status: StockStatus): string {
  switch (status) {
    case "in_stock":
      return "In stock";
    case "low_stock":
      return "Low stock";
    case "out_of_stock":
      return "Out of stock";
  }
}

export function stockTone(status: StockStatus): "muted" | "accent" {
  return status === "low_stock" ? "accent" : "muted";
}

export function isOutOfStock(product: MgdProduct): boolean {
  // `inStock` is the API's own convenience boolean; trust it over re-deriving.
  return !product.inStock;
}

/**
 * Show the MRP strike-through only when the API sent one.
 *
 * The doc is explicit that `mrp` is OMITTED when unset or not above `price`,
 * so presence must never be asserted — this is the guard for that.
 */
export function hasDiscount(product: MgdProduct): boolean {
  return typeof product.mrp === "number" && product.mrp > product.price;
}

/** Distinct brands present in a catalogue, for the filter rail. */
export function brandsFrom(products: MgdProduct[]): string[] {
  const seen = new Set<string>();
  for (const p of products) if (p.brand) seen.add(p.brand);
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/** Distinct categories present in a catalogue, for the filter rail. */
export function categoriesFrom(
  products: MgdProduct[],
): Array<{ id: string; name: string }> {
  const byId = new Map<string, string>();
  for (const p of products) if (p.category) byId.set(p.category.id, p.category.name);
  return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Distinct size labels present, for the filter rail. */
export function sizesFrom(products: MgdProduct[]): string[] {
  const seen = new Set<string>();
  for (const p of products) if (p.size) seen.add(p.size);
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/** Price bands for the filter rail, in rupees. */
export const PRICE_BANDS = [
  { label: "Under ₹1,000", min: 0, max: 999 },
  { label: "₹1,000 – ₹2,499", min: 1000, max: 2499 },
  { label: "₹2,500 – ₹4,999", min: 2500, max: 4999 },
  { label: "₹5,000 and above", min: 5000, max: Number.MAX_SAFE_INTEGER },
] as const;
