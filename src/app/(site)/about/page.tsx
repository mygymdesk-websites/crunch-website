import type { Metadata } from "next";

import { PageHero } from "@/components/site/PageHero";
import { CoverImage } from "@/components/ui/CoverImage";
import { Container, Eyebrow, Heading, Section } from "@/components/ui/Primitives";
import { AboutCta, AboutTrainers } from "@/components/about/AboutClient";
import {
  ABOUT_GALLERY,
  ABOUT_STATS,
  FACILITIES,
} from "@/lib/fixtures/site-content";
import { getLocations } from "@/lib/site-settings";
import { getSiteImages, getTrainers } from "@/lib/trainers";

export const metadata: Metadata = {
  title: "About",
  description:
    "Crunch Fitness started in 2018 with one floor, twelve members and a second-hand rack. Two owner-run gyms later, the principle hasn't changed.",
  alternates: { canonical: "/about" },
};

export const revalidate = 3600;

export default async function AboutPage() {
  const [locations, trainers, images] = await Promise.all([
    getLocations(),
    getTrainers(),
    getSiteImages(),
  ]);
  const aboutHero = images.about_hero ?? null;

  return (
    <>
      <PageHero
        eyebrow="About us"
        title="A neighbourhood gym that grew up"
        breadcrumb="/about"
        headingWidth="18ch"
        intro={
          /* Specific founding dates, member counts and coach counts were
             placeholder copy from the design mock. Removed rather than
             guessed — see CLIENT-CONTENT-REQUIRED in HANDOFF.md. */
          <>
            Crunch Fitness started with one floor in{" "}
            {locations[0]?.short_name} and grew into{" "}
            {locations.length === 2 ? "two gyms" : `${locations.length} gyms`}
            {" "}— same principle throughout: the person on the floor matters
            more than the equipment on it.
          </>
        }
      />

      <Container className="reveal pt-[76px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-12">
          <div className="aspect-[4/3] overflow-hidden rounded-[16px] border border-line">
            <CoverImage
              src={aboutHero?.url ?? null}
              alt="Crunch Fitness training floor"
              placeholderLabel="training floor photo"
            />
          </div>
          <div>
            <Eyebrow className="mb-3">Our story</Eyebrow>
            <Heading className="mb-[18px] !text-[clamp(26px,3.6vw,40px)]">
              Built by people who train here
            </Heading>
            <p className="m-0 mb-4 text-[15px] leading-[1.65] text-muted">
              Both gyms are owner-run. The people who decide which rack to buy
              are the same people using it at 6 AM. That is why the plates are
              calibrated, the cables get serviced monthly, and nobody is paid a
              commission to sell you a package you did not ask for.
            </p>
            <p className="m-0 mb-[26px] text-[15px] leading-[1.65] text-muted">
              We train students, shift workers, parents, competing lifters and
              people walking into a gym for the first time in their lives. The
              programme changes. The standard does not.
            </p>

            <div className="grid gap-3.5">
              {[
                [
                  "Coaching first.",
                  "Form checks are free and unlimited, at every membership level.",
                ],
                [
                  "Honest pricing.",
                  "One price list, GST invoice on every payment, no joining fee.",
                ],
                [
                  "Everyone gets a lane.",
                  "Beginners are not sent to the corner. Serious lifters are not slowed down.",
                ],
              ].map(([lead, rest], index) => (
                <div key={lead} className="flex items-start gap-3.5">
                  <span className="shrink-0 font-display text-[16px] font-semibold text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[14px] leading-[1.6]">
                    <b>{lead}</b> <span className="text-muted">{rest}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>

      {FACILITIES.length > 0 ? (
      <Section band="surface" className="mt-20">
        <Container className="reveal py-16">
          <div className="mb-[30px]">
            <Eyebrow className="mb-2.5">The facility</Eyebrow>
            <Heading className="!text-[clamp(26px,4vw,44px)]">
              What&rsquo;s on the floor
            </Heading>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {FACILITIES.map((facility) => (
              <article
                key={facility.name}
                className="overflow-hidden rounded-card border border-line bg-bg transition-[transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-accent"
              >
                <div className="h-[150px] overflow-hidden">
                  <CoverImage
                    src={facility.image}
                    alt={facility.name}
                    placeholderLabel={facility.name.toLowerCase()}
                  />
                </div>
                <div className="p-[18px]">
                  <Heading as="h3" size="card" className="mb-2 !text-[18px]">
                    {facility.name}
                  </Heading>
                  <p className="m-0 text-[13px] leading-[1.6] text-muted">
                    {facility.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </Section>
      ) : null}

      {/* Coaches hide until roles and branches are client-confirmed. */}
      {trainers.length > 0 ? (
      <Container className="reveal pt-[76px]">
        <div className="mb-[38px] text-center">
          <Eyebrow boxed className="mb-3.5">
            The team
          </Eyebrow>
          <Heading className="mb-2.5 !text-[clamp(26px,4vw,44px)]">
            Coaches on the floor
          </Heading>
          <p className="m-0 text-[14px] text-muted">
            Certified, full-time, and on shift — not commission staff passing
            through.
          </p>
        </div>
        <AboutTrainers trainers={trainers} />
      </Container>
      ) : null}

      {/* Stats band hides entirely rather than showing counts nobody measured. */}
      {ABOUT_STATS.length > 0 ? (
      <Section band="accent" className="mt-20">
        <div className="mx-auto grid w-full max-w-content grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-8 px-5 py-14 text-center">
          {ABOUT_STATS.map((stat, index) => (
            <div
              key={stat.label}
              style={{ animation: `countUp .6s ${index * 0.1}s both` }}
            >
              <div className="font-display text-[clamp(34px,5vw,54px)] font-semibold leading-none">
                {stat.value}
              </div>
              <div className="mt-1.5 text-[12px] uppercase tracking-[.12em] opacity-85">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Section>
      ) : null}

      {ABOUT_GALLERY.length > 0 ? (
      <Container className="reveal pt-[76px]">
        <div className="mb-5">
          <Eyebrow className="mb-2.5">Inside the gyms</Eyebrow>
          <Heading className="!text-[clamp(24px,3.4vw,38px)]">
            A look around
          </Heading>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {ABOUT_GALLERY.map((image, index) => (
            <div
              key={image}
              className="aspect-[4/3] overflow-hidden rounded-[10px] border border-line transition-opacity duration-300 hover:opacity-85"
            >
              <CoverImage
                src={image}
                alt=""
                placeholderLabel={`gym photo ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </Container>
      ) : null}

      <Section band="surface" className="mt-20 !border-b-0">
        <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-7 px-5 py-16">
          <div>
            <Heading className="mb-2.5 max-w-[18ch] !text-[clamp(26px,4vw,46px)]">
              Come see the floor before you pay for it.
            </Heading>
            <p className="m-0 text-[15px] text-muted">
              One free trial per person, at either location. No card needed.
            </p>
          </div>
          <AboutCta />
        </div>
      </Section>
    </>
  );
}
