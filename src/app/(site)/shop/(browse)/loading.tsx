import { Container, SkeletonBlock } from "@/components/ui/Primitives";

/**
 * Route-level fallback for the shop listing.
 *
 * It lives inside the `(browse)` route group so the boundary applies to `/shop`
 * ONLY. A loading boundary starts streaming, which commits the HTTP status
 * before the page body runs — and `shop/[slug]` calls `notFound()`, so a
 * boundary above it would turn every missing product into a soft 200. The
 * group scopes the boundary without changing the URL.
 */
export default function ShopLoading() {
  return (
    <Container className="py-16">
      <SkeletonBlock className="h-4 w-20 rounded-pill" />
      <SkeletonBlock className="mt-5 h-12 w-full max-w-xl rounded-lg" />
      <div className="mt-10 flex gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonBlock key={i} className="h-9 w-28 rounded-pill" />
        ))}
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonBlock key={i} className="h-72 rounded-xl" />
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading products…
      </span>
    </Container>
  );
}
