/**
 * Site-wide constants that are NOT location data.
 *
 * Location names, addresses, phones, emails and hours are deliberately absent
 * from this file — they live in `site_settings` (see src/lib/site-settings.ts).
 */

export const SITE_NAME = "Crunch Fitness";

export const SITE_DESCRIPTION =
  "Free weights, strength machines and group classes across two floors — run by coaches who actually know your name.";

/** Legal / compliance strings shown in the footer and on invoices. */
export const LEGAL = {
  gstin: "07AABCU9603R1ZX",
  /** The disambiguation line the client asked for on every page. */
  disclaimer:
    "An independent Indian gym chain. Not affiliated with any international franchise of a similar name.",
  paymentsLine: "Payments by Razorpay · Shipping by Shiprocket",
  generalEmail: "hello@crunchfitness.in",
  privacyEmail: "privacy@crunchfitness.in",
} as const;

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://crunchfitness.in"
  );
}

/** Primary navigation. Blog and Gallery are deliberately out of scope. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/classes", label: "Classes" },
  { href: "/packages", label: "Packages" },
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contact" },
] as const;

export const POLICY_LINKS = [
  { href: "/policies/refund", label: "Refund Policy" },
  { href: "/policies/guidelines", label: "Gym Guidelines & Etiquette" },
  { href: "/policies/terms", label: "Terms of Use" },
  { href: "/policies/privacy", label: "Privacy Policy" },
] as const;

/** Breakpoint the design uses to swap the header into hamburger mode. */
export const WIDE_MEDIA_QUERY = "(min-width: 1220px)";

/** Cookie/localStorage key for the visitor's chosen location. */
export const LOCATION_STORAGE_KEY = "cf.location";
export const THEME_STORAGE_KEY = "cf.theme";
export const CART_STORAGE_KEY = "cf.cart";
