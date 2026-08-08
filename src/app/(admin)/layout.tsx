import type { Metadata, Viewport } from "next";
import { Archivo, Oswald } from "next/font/google";
import { cookies } from "next/headers";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { themeFromCookie } from "@/lib/theme";
import { THEME_STORAGE_KEY } from "@/lib/site";

import "../globals.css";

/**
 * Root layout for /admin.
 *
 * A separate root layout from the public site, so the admin panel does not
 * inherit the marketing header, footer, cart drawer or trial modal — none of
 * which belong on an operations screen. Same design tokens and fonts, so it
 * still looks like the same product.
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

export const metadata: Metadata = {
  title: { default: "Admin — Crunch Fitness", template: "%s — Crunch Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = themeFromCookie(cookieStore.get(THEME_STORAGE_KEY)?.value);

  return (
    <html
      lang="en-IN"
      data-theme={theme === "dark" ? "dark" : undefined}
      className={`${oswald.variable} ${archivo.variable}`}
    >
      <body>
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
