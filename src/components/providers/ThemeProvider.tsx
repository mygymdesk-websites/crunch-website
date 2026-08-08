"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { THEME_STORAGE_KEY } from "@/lib/site";
import type { Theme } from "@/lib/theme";

export type { Theme };

/**
 * Light is the default; dark is opt-in via `data-theme="dark"` on <html>,
 * exactly as the token file expects.
 *
 * The preference lives in a COOKIE, so the SERVER stamps `data-theme` into the
 * HTML it sends. That means:
 *   - no flash of the wrong theme, without an inline script (React 19 hoists
 *     inline <script> tags, which made the script approach unreliable across
 *     the site and admin root layouts);
 *   - no hydration mismatch, because the server and the client agree on the
 *     first render.
 *
 * `<html data-theme>` is then the single source of truth at runtime, read via
 * `useSyncExternalStore` rather than mirrored into component state.
 */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function applyTheme(next: Theme): void {
  const root = document.documentElement;
  if (next === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");

  // 1 year. Lax so a normal top-level navigation keeps the choice.
  document.cookie = `${THEME_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;

  for (const listener of listeners) listener();
}

/** The server-rendered theme, so the first client snapshot agrees with it. */
const ServerThemeContext = createContext<Theme>("light");

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: ReactNode;
}) {
  return (
    <ServerThemeContext.Provider value={initialTheme}>
      {children}
    </ServerThemeContext.Provider>
  );
}

export function useTheme() {
  const serverTheme = useContext(ServerThemeContext);

  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => serverTheme,
  );

  const toggleTheme = useCallback(() => {
    applyTheme(getSnapshot() === "light" ? "dark" : "light");
  }, []);

  return useMemo(
    () => ({ theme, toggleTheme, icon: theme === "light" ? "☾" : "☀" }),
    [theme, toggleTheme],
  );
}
