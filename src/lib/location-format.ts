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

/**
 * Turns whatever someone pasted into a usable Google Maps embed src.
 *
 * Google's "Embed a map" tab hands you a full `<iframe …>` snippet, not a URL,
 * so that is what people paste — and an iframe whose src is itself an iframe
 * tag resolves as a relative path, which quietly loads the site inside its own
 * map frame. Accepting both forms is cheaper than expecting everyone to dig
 * the src out by hand, and far cheaper than the bug.
 *
 * Restricted to Google's embed host on purpose: this value becomes the src of
 * a frame on a public page, and "an admin pasted something odd" should fail
 * closed rather than embed an arbitrary site.
 */
export function mapEmbedSrc(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  // Pull the src out of an iframe snippet; otherwise treat it as a bare URL.
  const match = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  const candidate = (match ? match[1] : raw).trim();

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const googleHost = host === "google.com" || host.endsWith(".google.com");
  if (!googleHost || !url.pathname.startsWith("/maps/embed")) return null;

  return url.toString();
}
