import { PlanGridSkeleton } from "@/components/packages/PlanGrid";
import { Container, SkeletonBlock } from "@/components/ui/Primitives";

/**
 * Route-level fallback for the pricing page. See the note in
 * `classes/loading.tsx`: a loading boundary commits the HTTP status early, so
 * it belongs only on routes with no `notFound()` path beneath them.
 */
export default function PackagesLoading() {
  return (
    <>
      <Container className="pt-14">
        <SkeletonBlock className="h-4 w-32 rounded-pill" />
        <SkeletonBlock className="mt-5 h-12 w-full max-w-2xl rounded-lg" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-xl rounded" />
      </Container>

      <Container className="pt-14">
        <PlanGridSkeleton />
      </Container>

      <span className="sr-only" role="status">
        Loading membership plans…
      </span>
    </>
  );
}
