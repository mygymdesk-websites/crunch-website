export type Theme = "light" | "dark";

/**
 * Read the theme preference from its cookie.
 *
 * Lives in a neutral module, not the `"use client"` provider: root layouts are
 * Server Components and cannot call a function exported from a client module.
 * (The build accepts it; the request fails at runtime — which is why this is
 * split out.)
 */
export function themeFromCookie(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
