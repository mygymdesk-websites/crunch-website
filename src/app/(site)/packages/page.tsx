import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { PlanGrid, PlanGridSkeleton } from "@/components/packages/PlanGrid";
import { PageHero } from "@/components/site/PageHero";
import { Container, Eyebrow, Heading, Section } from "@/components/ui/Primitives";
import { getPlans, getPtPlans } from "@/lib/content";
import { PACKAGES_FAQS } from "@/lib/fixtures/site-content";
import { LOCATION_STORAGE_KEY } from "@/lib/site";
import { resolveLocation } from "@/lib/site-settings";
import type { SiteLocation } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Packages & Memberships",
  description:
    "One price list, no joining fee. Day pass, monthly, quarterly and annual gym memberships plus personal-training blocks. GST invoice emailed after every payment.",
  alternates: { canonical: "/packages" },
};

export const revalidate = 900;

export default async function PackagesPage() {
  const cookieStore = await cookies();
  const location = await resolveLocation(
    cookieStore.get(LOCATION_STORAGE_KEY)?.value,
  );

  return (
    <>
      <PageHero
        eyebrow="Memberships"
        title="One price list. No joining fee."
        breadcrumb="/packages"
        headingWidth="18ch"
        intro={
          <>
            Every plan covers the full floor at{" "}
            <b className="text-text">{location.name}</b>. Pay by UPI, card or
            netbanking through Razorpay — the GST invoice is emailed the same
            minute.
          </>
        }
      />

      <Container className="pt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <Eyebrow className="mb-2.5">Gym access</Eyebrow>
            <Heading className="!text-[clamp(24px,3.4vw,40px)]">
              Membership packages
            </Heading>
          </div>
          <span className="text-[13px] text-muted">
            Prices shown for {location.short_name}
          </span>
        </div>

        <Suspense fallback={<PlanGridSkeleton />}>
          <MembershipPlans location={location} />
        </Suspense>

        <p className="m-0 mt-[22px] text-center text-[13px] text-muted">
          GST invoice emailed after purchase · Membership starts the day you
          first check in · Renew from the Member App in two taps
        </p>
      </Container>

      <Section band="surface" className="mt-[76px]">
        <Container className="py-14">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow className="mb-2.5">One-to-one</Eyebrow>
              <Heading className="!text-[clamp(24px,3.4vw,40px)]">
                Personal training packages
              </Heading>
            </div>
            <span className="text-[13px] text-muted">
              Coach assigned after a fitness assessment
            </span>
          </div>
          <p className="m-0 mb-[26px] max-w-[60ch] text-[14px] text-muted">
            Sessions are 60 minutes, booked directly with your coach, and valid
            for six months from purchase. A gym membership is required alongside
            any PT block.
          </p>

          <Suspense fallback={<PlanGridSkeleton />}>
            <PtPlans location={location} />
          </Suspense>

          <p className="m-0 mt-[22px] text-center text-[13px] text-muted">
            Cancel or reschedule a session up to 12 hours ahead · Unused
            sessions expire after six months
          </p>
        </Container>
      </Section>

      <Container className="pt-14">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-10">
          <div>
            <Eyebrow className="mb-2.5">Renewals</Eyebrow>
            <Heading size="sub" className="mb-3.5">
              Renewing takes two taps
            </Heading>
            <p className="m-0 mb-3.5 text-[14px] leading-[1.65] text-muted">
              We send a WhatsApp reminder seven days before your plan ends with
              a payment link. Renew before it lapses and you keep your original
              rate for another term, even if prices have gone up.
            </p>
            <p className="m-0 text-[14px] leading-[1.65] text-muted">
              Freeze up to 7 days on Quarterly and 30 days on Annual — for
              travel, exams or injury. No paperwork, just message the front
              desk.
            </p>
          </div>

          <div className="grid gap-3">
            {PACKAGES_FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-[12px] border border-line bg-surface p-[18px]"
              >
                <div className="mb-[7px] text-[14px] font-bold">{faq.q}</div>
                <div className="text-[13px] leading-[1.6] text-muted">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}

async function MembershipPlans({ location }: { location: SiteLocation }) {
  const { plans } = await getPlans(location);

  if (plans.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-line px-6 py-[60px] text-center">
        <div className="mb-2.5 font-display text-[22px] font-semibold uppercase">
          No plans published for this location yet
        </div>
        <p className="mx-auto m-0 max-w-[46ch] text-[14px] text-muted">
          Membership pricing for {location.short_name} is being set up. Call the
          gym on {location.phone} and we&rsquo;ll quote you directly.
        </p>
      </div>
    );
  }

  return <PlanGrid plans={plans} kind="membership" />;
}

async function PtPlans({ location }: { location: SiteLocation }) {
  const { plans } = await getPtPlans(location);
  if (plans.length === 0) return null;
  return <PlanGrid plans={plans} kind="pt" />;
}
