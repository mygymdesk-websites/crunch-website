import type { Metadata, Viewport } from "next";
import { Archivo, Oswald } from "next/font/google";
import { cookies } from "next/headers";

import { AppProviders } from "@/components/providers/AppProviders";
import { themeFromCookie } from "@/lib/theme";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { TrialModal } from "@/components/site/TrialModal";
import {
  LOCATION_STORAGE_KEY,
  SITE_DESCRIPTION,
  SITE_NAME,
  THEME_STORAGE_KEY,
  siteUrl,
} from "@/lib/site";
import { getLocations, resolveLocation } from "@/lib/site-settings";

import "../globals.css";

/**
 * Oswald for display, Archivo for body/UI — per the design system.
 * Self-hosted by next/font so there is no render-blocking Google Fonts
 * request and no layout shift when the webfont lands.
 */
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-oswald",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

/**
 * Site-wide metadata defaults.
 *
 * `generateMetadata` rather than a static object because the default title
 * names the gyms — and those come from `site_settings`. Adding a third
 * location updates the title without a code change.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locations = await getLocations();
  const names = locations.map((l) => l.short_name);
  const suffix =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`
      : (names[0] ?? "");

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      // Every route sets its own title; this is the suffix and the fallback.
      default: suffix ? `${SITE_NAME} — ${suffix}` : SITE_NAME,
      template: `%s — ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url: siteUrl(),
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The header pill and the accent band both read as chrome colour on mobile.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locations are fetched once, server-side, and handed to the client
  // providers. No client component ever fetches or hardcodes them.
  const [locations, cookieStore] = await Promise.all([
    getLocations(),
    cookies(),
  ]);

  const savedSlug = cookieStore.get(LOCATION_STORAGE_KEY)?.value;
  const initialSlug =
    (savedSlug && locations.some((l) => l.slug === savedSlug)
      ? savedSlug
      : locations.find((l) => l.is_default)?.slug) ??
    locations[0]?.slug ??
    "";

  // Rendered into the HTML, so the first paint is already the right theme.
  const theme = themeFromCookie(cookieStore.get(THEME_STORAGE_KEY)?.value);

  // The footer's GSTIN is state-wise, so it follows the selected branch.
  const currentLocation = await resolveLocation(initialSlug);

  return (
    <html
      lang="en-IN"
      data-theme={theme === "dark" ? "dark" : undefined}
      className={`${oswald.variable} ${archivo.variable}`}
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-pill focus:bg-accent focus:px-5 focus:py-3 focus:text-[13px] focus:font-bold focus:uppercase focus:tracking-[.08em] focus:text-accent-ink"
        >
          Skip to content
        </a>

        <AppProviders
          locations={locations}
          initialLocationSlug={initialSlug}
          initialTheme={theme}
        >
          <Header />
          <main id="main">{children}</main>
          <Footer locations={locations} currentLocation={currentLocation} />
          <TrialModal />
          <CartDrawer />
        </AppProviders>
      </body>
    </html>
  );
}
