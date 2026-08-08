import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Container, Eyebrow, Heading } from "@/components/ui/Primitives";
import { NAV_LINKS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Container className="py-[clamp(64px,12vh,120px)]">
      <Eyebrow boxed className="mb-4">
        404
      </Eyebrow>
      <Heading as="h1" size="page" className="mb-4 max-w-[18ch]">
        That page has left the building.
      </Heading>
      <p className="m-0 mb-8 max-w-[52ch] text-[clamp(14px,1.7vw,17px)] leading-[1.6] text-muted">
        The link is broken or the page has moved. Nothing has gone wrong with
        your membership — everything below still works.
      </p>

      <div className="mb-10 flex flex-wrap gap-3">
        <ButtonLink href="/" size="lg">
          Back to home
        </ButtonLink>
        <ButtonLink href="/contact" variant="outline" size="lg">
          Contact us
        </ButtonLink>
      </div>

      <div className="border-t border-line pt-6">
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
          Try one of these
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-[14px] font-semibold">
          {NAV_LINKS.filter((link) => link.href !== "/").map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </Container>
  );
}
