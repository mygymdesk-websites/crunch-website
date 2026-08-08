import Link from "next/link";
import type { ReactNode } from "react";

import { Container, Eyebrow, Heading } from "@/components/ui/Primitives";

/**
 * The banner every inner page opens with: breadcrumb, boxed eyebrow, display
 * H1, muted intro. Sits on a surface band with a hairline bottom border.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  breadcrumb,
  meta,
  headingWidth = "20ch",
  size = "page",
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  /** Trailing path shown after the "/" home link, e.g. "/classes". */
  breadcrumb: string;
  /** Small line under the intro — "Last updated …", etc. */
  meta?: ReactNode;
  headingWidth?: string;
  size?: "page" | "section";
}) {
  return (
    <section className="border-b border-line bg-surface">
      <Container className="pt-5 text-[12px] text-muted">
        <nav aria-label="Breadcrumb">
          <Link href="/" className="text-muted">
            /
          </Link>{" "}
          <span className="text-text">{breadcrumb}</span>
        </nav>
      </Container>

      <Container className="animate-[fadeUp_.7s_both] pb-[52px] pt-10">
        <Eyebrow boxed className="mb-4">
          {eyebrow}
        </Eyebrow>
        <Heading as="h1" size={size} className="mb-4" style={{ maxWidth: headingWidth }}>
          {title}
        </Heading>
        {intro ? (
          <p className="m-0 max-w-[58ch] text-[clamp(14px,1.7vw,17px)] leading-[1.6] text-muted">
            {intro}
          </p>
        ) : null}
        {meta ? (
          <p className="m-0 mt-3 text-[12px] text-muted">{meta}</p>
        ) : null}
      </Container>
    </section>
  );
}
