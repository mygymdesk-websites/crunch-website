"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCATION_STORAGE_KEY } from "@/lib/site";
import type { SiteLocation } from "@/lib/supabase/types";

interface LocationContextValue {
  /** Every active location, in display order. Never hardcoded. */
  locations: SiteLocation[];
  /** The visitor's current gym. */
  location: SiteLocation;
  setLocationSlug: (slug: string) => void;
  isMultiLocation: boolean;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Carries the visitor's chosen gym across the whole site.
 *
 * The list arrives from the server (site_settings) — this provider never knows
 * a location's name, only that there are some. The choice is persisted twice:
 *
 *   - a cookie, so the SERVER can render the right location on the next
 *     request (no flash of the wrong gym, and correct SSR for SEO);
 *   - localStorage, as a belt-and-braces fallback if the cookie is dropped.
 *
 * Changing location calls `router.refresh()` so server components re-render
 * against the new cookie — that is what makes the timetable, shop stock and
 * contact details actually follow the selector.
 */
export function LocationProvider({
  locations,
  initialSlug,
  children,
}: {
  locations: SiteLocation[];
  initialSlug: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);

  const location = useMemo(
    () =>
      locations.find((l) => l.slug === slug) ??
      locations.find((l) => l.is_default) ??
      locations[0],
    [locations, slug],
  );

  const setLocationSlug = useCallback(
    (next: string) => {
      if (!locations.some((l) => l.slug === next)) return;
      setSlug(next);

      // 1 year, site-wide. Lax is enough — this is a display preference, and
      // it must survive a normal top-level navigation from an ad or a search
      // result.
      document.cookie = `${LOCATION_STORAGE_KEY}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
      try {
        window.localStorage.setItem(LOCATION_STORAGE_KEY, next);
      } catch {
        // Storage unavailable; the cookie is the one that matters.
      }

      // Re-render server components against the new cookie.
      router.refresh();
    },
    [locations, router],
  );

  const value = useMemo<LocationContextValue>(
    () => ({
      locations,
      location,
      setLocationSlug,
      isMultiLocation: locations.length > 1,
    }),
    [locations, location, setLocationSlug],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
