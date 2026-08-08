import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";

import {
  ClassCatalog,
  ClassCatalogSkeleton,
} from "@/components/classes/ClassCatalog";
import { Timetable, TimetableSkeleton } from "@/components/classes/Timetable";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Eyebrow, Heading, Section } from "@/components/ui/Primitives";
import { getClassCatalog, getClassSessions } from "@/lib/content";
import { LOCATION_STORAGE_KEY } from "@/lib/site";
import { resolveLocation } from "@/lib/site-settings";
import type { SiteLocation } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Classes & Timetable",
  description:
    "Forty-two coached classes a week across both Crunch Fitness gyms — strength, HIIT, spin, Zumba, yoga and conditioning. Capped at twenty people and starting on the minute.",
  alternates: { canonical: "/classes" },
};

export const revalidate = 900;

export default async function ClassesPage() {
  const cookieStore = await cookies();
  const location = await resolveLocation(
    cookieStore.get(LOCATION_STORAGE_KEY)?.value,
  );

  return (
    <>
      <PageHero
        eyebrow="Group classes"
        title="Forty-two classes a week. Pick your hour."
        breadcrumb="/classes"
        intro={
          <>
            Every class is coached, capped at twenty people, and starts on the
            minute. Showing the schedule for{" "}
            <b className="text-text">{location.name}</b>.
          </>
        }
      />

      {/*
        Suspense boundaries make the skeletons real: in Phase 2 these await a
        live MyGymDesk call, and a slow response shows the shimmer rather than
        blocking the whole page.
      */}
      <Container className="pt-14">
        <Suspense fallback={<ClassCatalogSkeleton />}>
          <CatalogSection location={location} />
        </Suspense>
      </Container>

      <Section band="surface" className="mt-[76px]">
        <Container className="py-14">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow className="mb-2.5">This week</Eyebrow>
              <Heading className="!text-[clamp(24px,3.4vw,40px)]">
                Weekly timetable
              </Heading>
            </div>
            <span className="text-[12px] text-muted">{location.short_name}</span>
          </div>
          <p className="m-0 mb-6 text-[12px] text-muted">
            Live from the gym&rsquo;s management system. Spots update as members
            book.
          </p>

          <Suspense fallback={<TimetableSkeleton />}>
            <TimetableSection location={location} />
          </Suspense>
        </Container>
      </Section>

      <Container className="pt-14">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[16px] border border-line bg-surface2 p-[clamp(24px,4vw,40px)]">
          <div>
            <Heading className="mb-2 max-w-[24ch] !text-[clamp(22px,3vw,34px)]">
              Classes are included in the annual plan
            </Heading>
            <p className="m-0 text-[14px] text-muted">
              Unlimited group classes on Annual and Quarterly. Single classes
              are pay-as-you-go.
            </p>
          </div>
          <ButtonLink href="/packages" size="lg">
            See packages
          </ButtonLink>
        </div>
      </Container>

      <Container className="pt-8">
        <p className="m-0 text-[12px] text-muted">
          Booking a class online lands in Phase 3. Until then,{" "}
          <Link href="/contact" className="border-b border-line">
            message the desk
          </Link>{" "}
          or book from the Member App.
        </p>
      </Container>
    </>
  );
}

async function CatalogSection({ location }: { location: SiteLocation }) {
  const { classes } = await getClassCatalog(location);
  return <ClassCatalog classes={classes} />;
}

async function TimetableSection({ location }: { location: SiteLocation }) {
  const { sessions } = await getClassSessions(location);
  return (
    <Timetable sessions={sessions} locationShortName={location.short_name} />
  );
}
