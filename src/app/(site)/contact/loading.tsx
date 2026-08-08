import { Container, SkeletonBlock } from "@/components/ui/Primitives";

/** Route-level fallback. See `classes/loading.tsx` for the scoping rule. */
export default function ContactLoading() {
  return (
    <Container className="py-16">
      <SkeletonBlock className="h-4 w-24 rounded-pill" />
      <SkeletonBlock className="mt-5 h-12 w-full max-w-2xl rounded-lg" />
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <SkeletonBlock className="h-[420px] rounded-xl" />
        <SkeletonBlock className="h-[420px] rounded-xl" />
      </div>
      <span className="sr-only" role="status">
        Loading…
      </span>
    </Container>
  );
}
