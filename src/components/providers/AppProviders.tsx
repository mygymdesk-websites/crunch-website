"use client";

import type { ReactNode } from "react";

import type { SiteLocation } from "@/lib/supabase/types";
import { CartProvider } from "./CartProvider";
import { LocationProvider } from "./LocationProvider";
import type { Theme } from "@/lib/theme";
import { ThemeProvider } from "./ThemeProvider";
import { TrialModalProvider } from "./TrialModalProvider";

/**
 * One client boundary for the whole site.
 *
 * `locations` is passed down from a server component so no client code ever
 * fetches — or knows — the location list. That is what keeps the "locations
 * are data" rule true all the way to the leaf components.
 */
export function AppProviders({
  locations,
  initialLocationSlug,
  initialTheme,
  children,
}: {
  locations: SiteLocation[];
  initialLocationSlug: string;
  initialTheme: Theme;
  children: ReactNode;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <LocationProvider
        locations={locations}
        initialSlug={initialLocationSlug}
      >
        <CartProvider>
          <TrialModalProvider>{children}</TrialModalProvider>
        </CartProvider>
      </LocationProvider>
    </ThemeProvider>
  );
}
