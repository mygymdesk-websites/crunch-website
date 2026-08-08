import type { SiteLocation } from "./supabase/types";

/**
 * Pure presentation helpers for a location.
 *
 * Deliberately separate from `site-settings.ts`, which is `server-only` — it
 * holds the Supabase read. Client components need to FORMAT a location they
 * were handed, not fetch one, and mixing the two would drag the server client
 * into the browser bundle. (The build catches this; the split is the fix.)
 */

/** Full street address on one line. */
export function formatAddress(location: SiteLocation): string {
  return [
    location.address_line1,
    location.address_line2,
    `${location.city}, ${location.state} ${location.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Address split into the lines the footer renders one per row. */
export function addressLines(location: SiteLocation): string[] {
  return [
    `${location.address_line1},`,
    [location.address_line2, location.city, location.postal_code]
      .filter(Boolean)
      .join(", "),
  ];
}

/**
 * wa.me link, from the explicit social URL if set, otherwise built from the
 * WhatsApp (or phone) number. Returns null when there is no usable number, so
 * callers can omit the row rather than render a dead link.
 */
export function whatsappLink(
  location: SiteLocation,
  message?: string,
): string | null {
  const explicit = location.socials?.whatsapp;
  if (explicit) return explicit;

  const digits = (location.whatsapp ?? location.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;

  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(location: SiteLocation): string {
  return `tel:${location.phone.replace(/[^\d+]/g, "")}`;
}

export function mailtoLink(location: SiteLocation): string {
  return `mailto:${location.email}`;
}

/** Label for the striped map placeholder, per the design's monospace pattern. */
export function mapPlaceholderLabel(location: SiteLocation): string {
  return `map — ${location.short_name}, ${location.city}`.toLowerCase();
}
