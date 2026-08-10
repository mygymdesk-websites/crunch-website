import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Hero } from "@/components/home/Hero";
import {
  HomeClasses,
  HomeNumbersAndAppointment,
  HomePackages,
  HomeSocial,
  HomeTestimonials,
  HomeTrainers,
  HomeTrialBand,
  HomeWhyUs,
} from "@/components/home/HomeSections";
import { LocationPicker } from "@/components/home/LocationPicker";
import { ShopStrip } from "@/components/shop/ShopStrip";
import {
  getClassCatalog,
  getPlans,
  getProducts,
  getPtPlans,
} from "@/lib/content";
import { LOCATION_STORAGE_KEY, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { getLocations, resolveLocation } from "@/lib/site-settings";
import { getSiteImages, getTrainers } from "@/lib/trainers";

/**
 * The homepage title names the gyms, so it is built from `site_settings`
 * rather than written down — a third location shows up here on its own.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locations = await getLocations();
  const names = locations.map((l) => l.short_name);
  const suffix =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`
      : (names[0] ?? "");

  return {
    // `absolute` opts out of the "%s — Crunch Fitness" template: the homepage
    // title already carries the brand.
    title: {
      absolute: suffix ? `${SITE_NAME} — ${suffix}` : SITE_NAME,
    },
    description: SITE_DESCRIPTION,
    alternates: { canonical: "/" },
  };
}

/**
 * ISR: display data changes a few times a week and all MyGymDesk endpoints
 * share one hourly budget per key, so public traffic is served from the cache
 * rather than mapped 1:1 onto API calls.
 */
export const revalidate = 900;

export default async function HomePage() {
  const cookieStore = await cookies();
  const location = await resolveLocation(
    cookieStore.get(LOCATION_STORAGE_KEY)?.value,
  );

  // Fetched on the server so the MGD key stays server-side and the page is
  // fully rendered for crawlers.
  // getPlans and getPtPlans read the SAME cached `resource=plans` response,
  // so asking for both costs one MyGymDesk request, not two.
  const [classes, plans, ptPlans, products, trainers, images] = await Promise.all([
    getClassCatalog(location),
    getPlans(location),
    getPtPlans(location),
    getProducts(location),
    // Client-managed content: coaches and the hero photograph.
    getTrainers(),
    getSiteImages(),
  ]);

  return (
    <>
      <Hero image={images.home_hero ?? null} />
      <LocationPicker />
      <HomeClasses classes={classes.data} />
      <HomeTrainers trainers={trainers} />
      <HomeWhyUs />
      <HomePackages plans={plans.data} ptPlans={ptPlans.data} />
      <ShopStrip products={products.data.products} />
      <HomeTestimonials />
      <HomeSocial />
      <HomeTrialBand />
      <HomeNumbersAndAppointment />
    </>
  );
}
