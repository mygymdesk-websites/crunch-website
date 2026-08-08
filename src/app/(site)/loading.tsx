import { Container, SkeletonBlock } from "@/components/ui/Primitives";

/**
 * Route-level fallback for the whole site group.
 *
 * The header, footer and location switcher live in the layout, so they stay
 * put across a navigation — only the main region swaps to this. That is the
 * point: the click gets an immediate, visibly correct response instead of the
 * browser sitting on the old page while the server renders.
 *
 * Deliberately generic. Each data-heavy page already has its own Suspense
 * skeletons shaped like its content (`ClassCatalogSkeleton`, `PlanGridSkeleton`
 * and so on); those take over the moment the page shell arrives, which is
 * quick now that the layout no longer blocks on a database read. This only has
 * to cover the gap before that, so a page-shaped hint beats a detailed guess
 * that would be wrong on most routes.
 */
export default function SiteLoading() {
  return (
    <Container className="py-16">
      <div className="max-w-2xl">
        <SkeletonBlock className="h-4 w-28 rounded-pill" />
        <SkeletonBlock className="mt-5 h-11 w-full rounded-lg" />
        <SkeletonBlock className="mt-3 h-11 w-4/5 rounded-lg" />
        <SkeletonBlock className="mt-6 h-4 w-full rounded" />
        <SkeletonBlock className="mt-2 h-4 w-11/12 rounded" />
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonBlock key={i} className="h-56 rounded-xl" />
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading…
      </span>
    </Container>
  );
}
