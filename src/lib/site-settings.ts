import { cache } from "react";

import seed from "../../supabase/seed/locations.seed.json";
import { getPublicSupabase } from "./supabase/server";
import type {
  LocationSocials,
  OpeningHoursRow,
  SiteLocation,
} from "./supabase/types";

/**
 * The location registry.
 *
 * Locations are DATA. Nothing in this codebase knows WHERE Crunch has gyms —
 * it knows there are rows in `site_settings`, ordered, one of them default.
 * Adding another is an INSERT plus an MGD branch id.
 *
 * Source of truth is the `site_settings_public` view. When Supabase
 * credentials are absent (fresh clone, or the client's project not created
 * yet) this falls back to the checked-in seed so the site still builds and
 * renders. The fallback is the same file the seed SQL is generated from, so
 * the two can't disagree.
 */

const PUBLIC_COLUMNS = `
  id, slug, name, short_name,
  address_line1, address_line2, city, state, postal_code, transit_note,
  phone, whatsapp, email,
  hours_summary, hours, closed_note,
  map_embed_url, map_link_url, latitude, longitude,
  socials, is_default, display_order, hero_image_url
`;

interface SeedLocation {
  slug: string;
  name: string;
  short_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  transit_note: string | null;
  phone: string;
  whatsapp: string | null;
  email: string;
  hours_summary: string;
  hours: OpeningHoursRow[];
  closed_note: string | null;
  map_embed_url: string | null;
  map_link_url: string | null;
  latitude: number | null;
  longitude: number | null;
  socials: LocationSocials;
  is_default: boolean;
  display_order: number;
  hero_image_url: string | null;
}

function fromSeed(): SiteLocation[] {
  const rows = (seed as { locations: (SeedLocation & { is_active: boolean })[] })
    .locations;
  return rows
    .filter((row) => row.is_active)
    .map((row) => ({
      // In fallback mode there are no database UUIDs. The slug is stable and
      // unique, which is all the UI needs it for. Anything that writes a real
      // FK resolves the id from the database by slug instead.
      id: row.slug,
      slug: row.slug,
      name: row.name,
      short_name: row.short_name,
      address_line1: row.address_line1,
      address_line2: row.address_line2 ?? null,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      transit_note: row.transit_note ?? null,
      phone: row.phone,
      whatsapp: row.whatsapp ?? null,
      email: row.email,
      hours_summary: row.hours_summary,
      hours: row.hours ?? [],
      closed_note: row.closed_note ?? null,
      map_embed_url: row.map_embed_url ?? null,
      map_link_url: row.map_link_url ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      socials: row.socials ?? {},
      is_default: row.is_default,
      display_order: row.display_order,
      hero_image_url: row.hero_image_url ?? null,
    }))
    .sort(byDisplayOrder);
}

function byDisplayOrder(a: SiteLocation, b: SiteLocation): number {
  return (
    a.display_order - b.display_order || a.short_name.localeCompare(b.short_name)
  );
}

/**
 * All active locations, in display order.
 *
 * `cache()` dedupes this across a single render pass — the header, footer and
 * page body all ask for the list and get one round trip.
 */
export const getLocations = cache(async (): Promise<SiteLocation[]> => {
  const supabase = getPublicSupabase();
  if (!supabase) return fromSeed();

  const { data, error } = await supabase
    .from("site_settings_public")
    .select(PUBLIC_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    // Serving stale-but-correct seed content beats serving a site with no
    // address and no phone number on it.
    console.error("[site-settings] falling back to seed:", error.message);
    return fromSeed();
  }
  if (!data || data.length === 0) return fromSeed();

  return (data as unknown as SiteLocation[])
    .map((row) => ({
      ...row,
      hours: Array.isArray(row.hours) ? row.hours : [],
      socials: row.socials ?? {},
    }))
    .sort(byDisplayOrder);
});

/** The location a first-time visitor sees, before they pick one. */
export async function getDefaultLocation(): Promise<SiteLocation> {
  const locations = await getLocations();
  return locations.find((l) => l.is_default) ?? locations[0];
}

/** Resolve a slug from the cookie/URL, falling back to the default. */
export async function resolveLocation(
  slug: string | null | undefined,
): Promise<SiteLocation> {
  const locations = await getLocations();
  const hit = slug ? locations.find((l) => l.slug === slug) : undefined;
  return hit ?? locations.find((l) => l.is_default) ?? locations[0];
}

// Presentation helpers (formatAddress, whatsappLink, …) live in
// `src/lib/location-format.ts`. They are deliberately NOT re-exported here:
// this module is server-only, and re-exporting would let a client component
// pull the Supabase server client into the browser bundle through the back
// door.
