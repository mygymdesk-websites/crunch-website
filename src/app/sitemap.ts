import type { MetadataRoute } from "next";

import { POLICY_DOCS } from "@/content/policies";
import { PRODUCT_FIXTURES } from "@/lib/fixtures/products";
import { siteUrl } from "@/lib/site";

/**
 * sitemap.xml
 *
 * Public, indexable routes only. /account and /checkout are per-visitor and
 * carry `robots: noindex` in their own metadata, so they are absent here too.
 *
 * PHASE 6 adds the legacy 301 map (PRD §B6): crawl the old PHP site, map every
 * legacy URL onto its new route in next.config.ts `redirects()`, and submit
 * this sitemap to Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
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

  const products: MetadataRoute.Sitemap = PRODUCT_FIXTURES.map((product) => ({
    url: `${base}/shop/${product.slug}`,
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
