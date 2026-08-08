import type { MgdProduct, ProductsResponse } from "@/lib/mgd/types";

/**
 * Placeholder shop catalog, shaped like the planned `GET website-products`
 * (PRD §3, A1 — not live until Phase 2 on the MyGymDesk side).
 *
 * Stock is per-location because the real endpoint is location-filtered: a tub
 * on the shelf at one gym is not stock at another. `stock: 0` drives the
 * sold-out state on the card and disables Add to cart.
 */

const UNSPLASH = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

export interface ProductFixture extends Omit<MgdProduct, "stock" | "locationId" | "locationName"> {
  /** URL slug for the product detail route. */
  slug: string;
  /** Filterable size/variant token, e.g. "1 kg", "L". */
  size: string;
  /** Merchandising flag shown as a corner chip. */
  flag: string | null;
  /** Long copy for the product page. */
  description: string;
  highlights: string[];
  /** Stock by location slug. */
  stockBySlug: Record<string, number>;
}

export const PRODUCT_FIXTURES: ProductFixture[] = [
  {
    id: "prd-1",
    slug: "gold-standard-whey-1kg-chocolate",
    brand: "Optimum Nutrition",
    name: "Gold Standard Whey",
    variant: "1 kg · Chocolate",
    category: "Supplements",
    size: "1 kg",
    price: 4299,
    listPrice: 4799,
    currency: "INR",
    imageUrl: UNSPLASH("1593095948071-474c5cc2989d", 600),
    flag: "Bestseller",
    description:
      "24 g of protein a scoop, sourced through an authorised distributor. Sealed tub with a scannable authenticity code on the base.",
    highlights: [
      "24 g protein · 5.5 g BCAAs per 30 g scoop",
      "Authorised-distributor stock, sealed tub",
      "Batch and expiry printed on the base",
    ],
    stockBySlug: { "vasant-kunj": 14, gurgaon: 6 },
  },
  {
    id: "prd-2",
    slug: "gold-standard-whey-2kg-vanilla",
    brand: "Optimum Nutrition",
    name: "Gold Standard Whey",
    variant: "2 kg · Vanilla",
    category: "Supplements",
    size: "2 kg",
    price: 7899,
    listPrice: 8599,
    currency: "INR",
    imageUrl: UNSPLASH("1579722820308-d74e571900a9", 600),
    flag: null,
    description:
      "The 2 kg tub, for people who have stopped pretending the 1 kg lasts a month.",
    highlights: [
      "24 g protein per 30 g scoop",
      "Roughly 66 servings",
      "Authorised-distributor stock, sealed tub",
    ],
    stockBySlug: { "vasant-kunj": 3, gurgaon: 0 },
  },
  {
    id: "prd-3",
    slug: "creatine-monohydrate-250g",
    brand: "MuscleBlaze",
    name: "Creatine Monohydrate",
    variant: "250 g · Unflavoured",
    category: "Supplements",
    size: "250 g",
    price: 999,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1622484212850-eb596d769edc", 600),
    flag: null,
    description:
      "Micronised creatine monohydrate. Three grams a day, every day — the least glamorous supplement that actually works.",
    highlights: [
      "3 g per serving, ~83 servings",
      "Micronised, mixes without grit",
      "Unflavoured — goes into anything",
    ],
    stockBySlug: { "vasant-kunj": 22, gurgaon: 11 },
  },
  {
    id: "prd-4",
    slug: "training-tee-black-m",
    brand: "Crunch",
    name: "Training Tee",
    variant: "Black · M",
    category: "Apparel",
    size: "M",
    price: 899,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1521572163474-6864f9cf17ab", 600),
    flag: null,
    description:
      "Cotton-blend tee cut for training, not for the photo afterwards. Pre-shrunk.",
    highlights: ["60/40 cotton-poly", "Pre-shrunk", "Machine wash cold"],
    stockBySlug: { "vasant-kunj": 2, gurgaon: 9 },
  },
  {
    id: "prd-5",
    slug: "training-tee-black-l",
    brand: "Crunch",
    name: "Training Tee",
    variant: "Black · L",
    category: "Apparel",
    size: "L",
    price: 899,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1503341504253-dff4815485f1", 600),
    flag: null,
    description:
      "Cotton-blend tee cut for training, not for the photo afterwards. Pre-shrunk.",
    highlights: ["60/40 cotton-poly", "Pre-shrunk", "Machine wash cold"],
    stockBySlug: { "vasant-kunj": 7, gurgaon: 0 },
  },
  {
    id: "prd-6",
    slug: "performance-shorts-charcoal-l",
    brand: "Crunch",
    name: "Performance Shorts",
    variant: "Charcoal · L",
    category: "Apparel",
    size: "L",
    price: 1299,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1483721310020-03333e577078", 600),
    flag: null,
    description:
      "Seven-inch inseam, zip pocket that actually holds a phone through a set of lunges.",
    highlights: ["7-inch inseam", "Zip side pocket", "Four-way stretch"],
    stockBySlug: { "vasant-kunj": 5, gurgaon: 4 },
  },
  {
    id: "prd-7",
    slug: "pro-wrist-wrap-gloves-l",
    brand: "Harbinger",
    name: "Pro Wrist Wrap Gloves",
    variant: "Size L",
    category: "Gear",
    size: "L",
    price: 1650,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1583454110551-21f2fa2afe61", 600),
    flag: null,
    description:
      "Leather palm, wrap-around wrist support. For people whose grip gives out before their back does.",
    highlights: [
      "Leather palm with padded protection",
      "Adjustable wrist wrap",
      "Vented back panel",
    ],
    stockBySlug: { "vasant-kunj": 8, gurgaon: 2 },
  },
  {
    id: "prd-8",
    slug: "lifting-belt-4-inch-m",
    brand: "Harbinger",
    name: "4-inch Lifting Belt",
    variant: "Size M",
    category: "Gear",
    size: "M",
    price: 3200,
    listPrice: 3600,
    currency: "INR",
    imageUrl: UNSPLASH("1517963879433-6ad2b056d712", 600),
    flag: null,
    description:
      "Four inches, uniform width, single prong. Ask a coach to size you before you buy — belts are the thing people get wrong most often.",
    highlights: [
      "4-inch uniform width",
      "Single-prong steel buckle",
      "Suede lining",
    ],
    stockBySlug: { "vasant-kunj": 0, gurgaon: 3 },
  },
  {
    id: "prd-9",
    slug: "steel-shaker-700ml",
    brand: "Crunch",
    name: "Steel Shaker",
    variant: "700 ml",
    category: "Accessories",
    size: "700 ml",
    price: 649,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1517838277536-f5f99be501cd", 600),
    flag: null,
    description:
      "Stainless steel, leak-proof lid, no plastic aftertaste by week three.",
    highlights: ["700 ml stainless steel", "Leak-proof screw lid", "Dishwasher safe"],
    stockBySlug: { "vasant-kunj": 0, gurgaon: 0 },
  },
  {
    id: "prd-10",
    slug: "resistance-band-set",
    brand: "Crunch",
    name: "Resistance Band Set",
    variant: "3 bands",
    category: "Gear",
    size: "One size",
    price: 1199,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1517836357463-d25dfeac3438", 600),
    flag: "New",
    description:
      "Light, medium and heavy loops for warm-ups, pull-up assistance and travel.",
    highlights: ["Three loop bands", "Natural latex", "Carry pouch included"],
    stockBySlug: { "vasant-kunj": 12, gurgaon: 7 },
  },
  {
    id: "prd-11",
    slug: "bcaa-recovery-450g",
    brand: "MuscleBlaze",
    name: "BCAA Recovery",
    variant: "450 g · Watermelon",
    category: "Supplements",
    size: "450 g",
    price: 1799,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1595348020949-87cdfbb44174", 600),
    flag: null,
    description: "Intra-workout branched-chain aminos with electrolytes.",
    highlights: [
      "7 g BCAA per serving, 2:1:1",
      "Added electrolytes",
      "~30 servings",
    ],
    stockBySlug: { "vasant-kunj": 6, gurgaon: 1 },
  },
  {
    id: "prd-12",
    slug: "gym-towel",
    brand: "Crunch",
    name: "Gym Towel",
    variant: "Cotton · 40×80 cm",
    category: "Accessories",
    size: "One size",
    price: 399,
    listPrice: null,
    currency: "INR",
    imageUrl: UNSPLASH("1596727147705-61a532a659bd", 600),
    flag: null,
    description:
      "The towel you are required to carry, in a size that actually covers a bench.",
    highlights: ["100% cotton", "40 × 80 cm", "Hanging loop"],
    stockBySlug: { "vasant-kunj": 18, gurgaon: 14 },
  },
];

/** Product list for one location, in the shape `website-products` will return. */
export function productsFixture(locationSlug: string): ProductsResponse {
  return {
    products: PRODUCT_FIXTURES.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      variant: p.variant,
      price: p.price,
      listPrice: p.listPrice,
      stock: p.stockBySlug[locationSlug] ?? 0,
      imageUrl: p.imageUrl,
      currency: p.currency,
      locationId: locationSlug,
      locationName: locationSlug,
    })),
  };
}

export function findProductBySlug(slug: string): ProductFixture | undefined {
  return PRODUCT_FIXTURES.find((p) => p.slug === slug);
}

export function productSlugById(id: string): string | undefined {
  return PRODUCT_FIXTURES.find((p) => p.id === id)?.slug;
}

export const PRODUCT_CATEGORIES = [
  "All",
  "Supplements",
  "Apparel",
  "Gear",
  "Accessories",
] as const;

export const PRODUCT_BRANDS = [
  "All",
  "Crunch",
  "Optimum Nutrition",
  "MuscleBlaze",
  "Harbinger",
] as const;

export const PRODUCT_SIZES = [
  "All",
  "M",
  "L",
  "1 kg",
  "2 kg",
  "250 g",
  "450 g",
  "700 ml",
  "One size",
] as const;

export const PRICE_BANDS = [
  { label: "Under ₹1,000", min: 0, max: 999 },
  { label: "₹1,000 – ₹2,499", min: 1000, max: 2499 },
  { label: "₹2,500 – ₹4,999", min: 2500, max: 4999 },
  { label: "₹5,000 and above", min: 5000, max: Number.MAX_SAFE_INTEGER },
] as const;

/** Flat shipping rate quoted on the shop and checkout. */
export const SHIPPING_FLAT_RATE = 79;

/** GST applied to shop orders. */
export const GST_RATE = 0.18;
