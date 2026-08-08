import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * robots.txt
 *
 * /admin, /account, /checkout and the API are disallowed — none of them have
 * anything a search engine should hold. The rest of the site is open, since
 * organic search is the reason for the rebuild.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/account", "/checkout", "/api/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
