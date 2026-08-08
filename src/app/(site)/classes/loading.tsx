import {
  ClassCatalogSkeleton,
} from "@/components/classes/ClassCatalog";
import { TimetableSkeleton } from "@/components/classes/Timetable";
import { Container, SkeletonBlock } from "@/components/ui/Primitives";

/**
 * Route-level fallback so a click on "Classes" paints immediately instead of
 * sitting on the previous page while the server renders.
 *
 * Scoped to this route rather than the whole site group on purpose. A
 * `loading.tsx` starts streaming the response, which commits the HTTP status
 * before the page body runs — so any route that can call `notFound()` would
 * start answering 200 instead of 404. `/classes` has no dynamic child and no
 * not-found path, so a boundary here is safe. `/shop` and `/policies` do have
 * one, which is why they deliberately have no `loading.tsx`.
 */
export default function ClassesLoading() {
  return (
    <>
      <Container className="pt-14">
        <SkeletonBlock className="h-4 w-32 rounded-pill" />
        <SkeletonBlock className="mt-5 h-12 w-full max-w-2xl rounded-lg" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-xl rounded" />
      </Container>

      <Container className="pt-14">
        <ClassCatalogSkeleton />
      </Container>

      <Container className="pt-14">
        <TimetableSkeleton />
      </Container>

      <span className="sr-only" role="status">
        Loading classes…
      </span>
    </>
  );
}
