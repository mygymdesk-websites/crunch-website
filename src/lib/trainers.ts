import "server-only";

import { cache } from "react";

import { getPublicSupabase } from "./supabase/server";

/**
 * Trainers and site-wide imagery, read for the public site.
 *
 * Same shape as `getLocations`: `cache()` dedupes within a render, and the
 * underlying REST call sits in Next's data cache so the database is off the
 * per-request path. Both are invalidated by tag when an admin saves.
 */

export const SITE_CONTENT_TAG = "site-content";

export interface Trainer {
  id: string;
  name: string;
  role: string | null;
  specialism: string | null;
  location_id: string | null;
  image_url: string | null;
  display_order: number;
}

export type ImageSlot = "home_hero" | "about_hero";

export interface SiteImage {
  slot: ImageSlot;
  url: string | null;
  alt: string | null;
}

/** Published trainers, in display order. Empty until the client adds them. */
export const getTrainers = cache(async (): Promise<Trainer[]> => {
  const supabase = getPublicSupabase({
    revalidate: 300,
    tags: [SITE_CONTENT_TAG],
  });
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("trainers_public")
    .select("id, name, role, specialism, location_id, image_url, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    // A missing coaches section is a cosmetic loss; a crashed homepage is not.
    console.error("[trainers] read failed:", error.message);
    return [];
  }
  return (data ?? []) as Trainer[];
});

/** Site-wide imagery by slot. A null url renders the striped placeholder. */
export const getSiteImages = cache(async (): Promise<Record<string, SiteImage>> => {
  const supabase = getPublicSupabase({
    revalidate: 300,
    tags: [SITE_CONTENT_TAG],
  });
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("site_images")
    .select("slot, url, alt");

  if (error) {
    console.error("[site-images] read failed:", error.message);
    return {};
  }

  const out: Record<string, SiteImage> = {};
  for (const row of (data ?? []) as SiteImage[]) out[row.slot] = row;
  return out;
});
