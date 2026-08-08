import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/site/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading } from "@/components/ui/Primitives";
import { POLICY_DOCS, findPolicy, sectionId } from "@/content/policies";
import { LEGAL } from "@/lib/site";
import { pad2 } from "@/lib/format";
import { getLocations } from "@/lib/site-settings";

export const revalidate = 3600;

export function generateStaticParams() {
  return POLICY_DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = findPolicy(slug);
  if (!doc) return { title: "Policy not found" };

  return {
    title: doc.title,
    description: doc.intro,
    alternates: { canonical: `/policies/${doc.slug}` },
  };
}

/**
 * One legal template, four documents.
 *
 * Layout is a sticky rail (all policies + this page's contents) beside the
 * article, collapsing to a single column below the 1220px header breakpoint —
 * the same breakpoint the rest of the site uses.
 */
export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = findPolicy(slug);
  if (!doc) notFound();

  const locations = await getLocations();
  const others = POLICY_DOCS.filter((d) => d.slug !== doc.slug);

  return (
    <>
      <PageHero
        eyebrow="Policies"
        title={doc.title}
        breadcrumb={`/policies/${doc.slug}`}
        intro={doc.intro}
        headingWidth="20ch"
        size="section"
        meta={
          <>
            Last updated {doc.updated} · Applies to{" "}
            {locations.length === 2
              ? "both Crunch Fitness locations"
              : `all ${locations.length} Crunch Fitness locations`}
          </>
        }
      />

      <Container className="pt-9">
        <div className="grid grid-cols-1 items-start gap-[30px] min-[1220px]:grid-cols-[270px_1fr]">
          <nav
            aria-label="Policies"
            className="rounded-card border border-line bg-surface p-[18px] min-[1220px]:sticky min-[1220px]:top-[88px]"
          >
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
              All policies
            </div>
            <div className="mb-[18px] grid gap-1">
              {POLICY_DOCS.map((entry) => {
                const current = entry.slug === doc.slug;
                return (
                  <Link
                    key={entry.slug}
                    href={`/policies/${entry.slug}`}
                    aria-current={current ? "page" : undefined}
                    className={`rounded-lg px-[13px] py-[11px] text-[13px] font-semibold leading-[1.35] ${
                      current
                        ? "bg-accent text-accent-ink hover:text-accent-ink"
                        : "bg-transparent text-text hover:bg-surface2"
                    }`}
                  >
                    {entry.label}
                  </Link>
                );
              })}
            </div>

            <div className="mb-2.5 border-t border-line pt-4 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
              On this page
            </div>
            <div className="grid gap-[7px]">
              {doc.sections.map((section, index) => (
                <a
                  key={section.title}
                  href={`#${sectionId(doc, index)}`}
                  className="text-[12px] leading-[1.45] text-muted hover:text-accent"
                >
                  {pad2(index + 1)}. {section.title}
                </a>
              ))}
            </div>
          </nav>

          <article className="rounded-[16px] border border-line bg-surface p-[clamp(24px,4vw,44px)]">
            {doc.sections.map((section, index) => (
              <section
                key={section.title}
                id={sectionId(doc, index)}
                className="mb-[26px] border-b border-line pb-[26px] [scroll-margin-top:100px] last-of-type:mb-0 last-of-type:border-b-0"
              >
                <Heading
                  as="h2"
                  className="mb-3.5 !text-[clamp(19px,2.4vw,24px)] !leading-[1.2]"
                >
                  <span className="mr-[9px] text-accent">
                    {pad2(index + 1)}
                  </span>
                  {section.title}
                </Heading>

                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="m-0 mb-3 max-w-[78ch] text-[15px] leading-[1.7] text-muted"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.list ? (
                  <div className="mt-1.5 grid gap-[9px]">
                    {section.list.map((item) => (
                      <div
                        key={item}
                        className="flex max-w-[78ch] items-start gap-[11px] text-[15px] leading-[1.65] text-muted"
                      >
                        <span aria-hidden="true" className="shrink-0 text-accent">
                          —
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {section.note ? (
                  <div className="mt-4 max-w-[78ch] rounded-field border border-accent bg-accent-soft p-4 text-[14px] leading-[1.65] text-text">
                    {section.note}
                  </div>
                ) : null}
              </section>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="m-0 max-w-[46ch] text-[13px] leading-[1.6] text-muted">
                Questions about this policy? Write to{" "}
                <a
                  href={`mailto:${LEGAL.generalEmail}`}
                  className="font-bold text-text"
                >
                  {LEGAL.generalEmail}
                </a>{" "}
                or ask at the front desk.
              </p>
              <ButtonLink href="/contact" size="sm">
                Contact us
              </ButtonLink>
            </div>
          </article>
        </div>
      </Container>

      <Container className="pt-12">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          {others.map((entry) => (
            <Link
              key={entry.slug}
              href={`/policies/${entry.slug}`}
              className="rounded-[12px] border border-line bg-surface p-5 transition-[transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-accent"
            >
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-muted">
                Also read
              </span>
              <span className="mb-1.5 block font-display text-[18px] font-semibold uppercase">
                {entry.label}
              </span>
              <span className="block text-[13px] leading-[1.55] text-muted">
                {entry.blurb}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
