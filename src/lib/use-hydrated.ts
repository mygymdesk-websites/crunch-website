"use client";

import { useSyncExternalStore } from "react";

/** No-op subscribe: the answer flips exactly once, at hydration. */
const noopSubscribe = () => () => {};

/**
 * `false` while rendering on the server and during the hydration pass, `true`
 * afterwards.
 *
 * The point is browser-only state — the cart in localStorage, the stored theme
 * — which the server cannot know. Guarding on this renders the same markup on
 * both sides (so hydration matches), then reveals the real value on the next
 * client render.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: it is the
 * primitive React provides for exactly this server/client snapshot split, and
 * it doesn't trip the cascading-render lint.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
