import { Container, SkeletonBlock } from "@/components/ui/Primitives";

/**
 * Route-level fallback for the homepage.
 *
 * Inside the `(home)` route group so it covers `/` only. Placed at the site
 * root it would also sit above the `[...notFound]` catch-all, and a streaming
 * boundary commits the HTTP status before `notFound()` runs — every unknown URL
 * would answer 200 instead of 404.
 */
export default function HomeLoading() {
  return (
    <>
      <SkeletonBlock className="h-[60vh] min-h-[420px] w-full" />
      <Container className="py-16">
        <SkeletonBlock className="h-4 w-28 rounded-pill" />
        <SkeletonBlock className="mt-5 h-10 w-full max-w-xl rounded-lg" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </Container>
      <span className="sr-only" role="status">
        Loading…
      </span>
    </>
  );
}
