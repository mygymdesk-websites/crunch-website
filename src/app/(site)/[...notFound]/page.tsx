import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched URLs.
 *
 * With two root layouts — `(site)` and `(admin)` — Next has no single root to
 * hang a top-level `not-found.tsx` on, so an unmatched URL would otherwise get
 * the framework's bare built-in 404 with no header, footer or branding.
 *
 * Matching everything here and calling `notFound()` routes it into
 * `(site)/not-found.tsx` instead, which renders inside the normal site chrome.
 * That matters for the Phase 6 cutover: a mistyped legacy URL should still
 * look like the gym's website and offer a way back.
 */
export default function CatchAll(): never {
  notFound();
}
