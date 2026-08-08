import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { ShopBrowser, ShopSkeleton } from "@/components/shop/ShopBrowser";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";
import { getProducts } from "@/lib/content";
import { formatINR } from "@/lib/format";
import { SHIPPING_FLAT_RATE } from "@/lib/shop";
import { LOCATION_STORAGE_KEY } from "@/lib/site";
import { resolveLocation } from "@/lib/site-settings";
import type { SiteLocation } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Supplements, apparel and training gear stocked at Crunch Fitness. Collect at the desk or have it shipped anywhere in India via Shiprocket.",
  alternates: { canonical: "/shop" },
};

export const revalidate = 900;

export default async function ShopPage() {
  const cookieStore = await cookies();
  const location = await resolveLocation(
    cookieStore.get(LOCATION_STORAGE_KEY)?.value,
  );

  return (
    <>
      <PageHero
        eyebrow="Shop"
        title="The counter, online"
        breadcrumb="/shop"
        intro={
          <>
            Supplements, apparel and training gear stocked at the gym. Stock
            shown for <b className="text-text">{location.name}</b> — pick up at
            the desk or have it shipped.
          </>
        }
      />

      <Container className="pt-8">
        <Suspense fallback={<ShopSkeleton />}>
          <Catalog location={location} />
        </Suspense>
      </Container>

      <Container className="pt-14">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <InfoCard title="Pickup at the gym">
            Order online, collect at the desk within 24 hours. No delivery
            charge.
          </InfoCard>
          <InfoCard title="Shipped via Shiprocket">
            {formatINR(SHIPPING_FLAT_RATE)} flat across India, 3–5 working days.
            Tracking link sent on WhatsApp.
          </InfoCard>
          <InfoCard title="Genuine stock only">
            Sourced from authorised distributors. Sealed tubs, scannable
            authenticity codes.
          </InfoCard>
        </div>
      </Container>
    </>
  );
}

async function Catalog({ location }: { location: SiteLocation }) {
  const { data, degraded } = await getProducts(location);

  if (data.products.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line px-6 py-[60px] text-center">
        <div className="mb-2.5 font-display text-[22px] font-semibold uppercase">
          {degraded
            ? "The shop is briefly unavailable"
            : "Nothing in the shop just yet"}
        </div>
        <p className="mx-auto m-0 mb-5 max-w-[46ch] text-[14px] text-muted">
          {degraded
            ? "We couldn't reach the gym's stock system. Please try again shortly — the counter at the gym has everything in the meantime."
            : `The ${location.short_name} counter stocks supplements, apparel and gear; it isn't listed online yet. Ask at the desk and we'll sort you out.`}
        </p>
        <ButtonLink href="/contact" variant="outline" size="sm">
          Contact the gym
        </ButtonLink>
      </div>
    );
  }

  return <ShopBrowser products={data.products} />;
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-5">
      <div className="mb-1.5 font-display text-[16px] font-semibold uppercase">
        {title}
      </div>
      <p className="m-0 text-[13px] leading-[1.6] text-muted">{children}</p>
    </div>
  );
}
