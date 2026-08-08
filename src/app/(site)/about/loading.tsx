import { Container, SkeletonBlock } from "@/components/ui/Primitives";

/**
 * Route-level fallback. See `classes/loading.tsx` for why these are scoped per
 * route rather than placed once at the site root.
 */
export default function AboutLoading() {
  return (
    <Container className="py-16">
      <SkeletonBlock className="h-4 w-24 rounded-pill" />
      <SkeletonBlock className="mt-5 h-12 w-full max-w-2xl rounded-lg" />
      <SkeletonBlock className="mt-4 h-4 w-full max-w-xl rounded" />
      <SkeletonBlock className="mt-12 h-[320px] w-full rounded-xl" />
      <span className="sr-only" role="status">
        Loading…
      </span>
    </Container>
  );
}
