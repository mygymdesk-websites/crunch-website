import type { MetadataRoute } from "next";

import { POLICY_DOCS } from "@/content/policies";
import { getProducts } from "@/lib/content";
import { productSlug } from "@/lib/shop";
import { siteUrl } from "@/lib/site";
import { getDefaultLocation } from "@/lib/site-settings";

/**
 * sitemap.xml
 *
 * Public, indexable routes only. /account and /checkout are per-visitor and
 * carry `robots: noindex` in their own metadata, so they are absent here too.
 *
 * Product URLs come from the live catalogue at the default location. A gym
 * with an unreachable API or nothing published still gets a valid sitemap of
 * its core pages — `getProducts` degrades to an empty list rather than
 * throwing, so this never fails the build.
 *
 * PHASE 6 adds the legacy 301 map (PRD §B6): crawl the old PHP site, map every
 * legacy URL onto its new route in next.config.ts `redirects()`, and submit
 * this sitemap to Search Console.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const core: MetadataRoute.Sitemap = (
    [
      { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/about`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${base}/classes`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/packages`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/shop`, changeFrequency: "daily", priority: 0.8 },
      { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.7 },
    ] satisfies MetadataRoute.Sitemap
  ).map((entry) => ({ ...entry, lastModified: now }));

  const location = await getDefaultLocation();
  const { data } = await getProducts(location);

  const products: MetadataRoute.Sitemap = data.products.map((product) => ({
    url: `${base}/shop/${productSlug(product)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const policies: MetadataRoute.Sitemap = POLICY_DOCS.map((doc) => ({
    url: `${base}/policies/${doc.slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...core, ...products, ...policies];
}
