import {
  CLASS_CATALOG_FIXTURE,
  classSessionsFixture,
} from "@/lib/fixtures/classes";
import { MEMBERSHIP_PLANS_FIXTURE, PT_PLANS_FIXTURE } from "@/lib/fixtures/plans";
import { productsFixture } from "@/lib/fixtures/products";
import type {
  ClassCatalogResponse,
  ClassSessionsResponse,
  PlansResponse,
  ProductsResponse,
} from "@/lib/mgd/types";
import type { SiteLocation } from "@/lib/supabase/types";

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  THE PHASE 2 SWAP POINT
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Every page reads its plans / classes / timetable / products through this
 * module and nothing else. Today each function returns a typed fixture; in
 * Phase 2 the body is replaced with the matching `mgd()` call and no page,
 * component or type changes:
 *
 *     export async function getPlans(location: SiteLocation) {
 *       return mgd().getPlans({ locationId: location.mgd_location_id });
 *     }
 *
 * Two rules survive that swap:
 *
 *   1. Location filtering goes through `mgd_location_id`, never a slug or a
 *      name. A location with no MGD branch id yet gets an unfiltered read
 *      rather than a guess.
 *
 *   2. Display reads are cached server-side (15 min, see lib/mgd/client.ts).
 *      All MGD endpoints share ONE hourly budget per key, so public traffic
 *      must never map 1:1 onto API calls.
 */

/** True once real MGD data is wired up. Drives "live vs placeholder" copy. */
export const IS_LIVE_DATA = false;

export async function getPlans(location: SiteLocation): Promise<PlansResponse> {
  void location;
  return MEMBERSHIP_PLANS_FIXTURE;
}

/**
 * Personal-training packages.
 *
 * ⚠ `website-services?resource=plans` explicitly excludes PT plans. Phase 2
 * must confirm whether the gym models PT blocks as *service packages* (which
 * the endpoint does return) — if not, this section needs a Track A change.
 * See HANDOFF.md.
 */
export async function getPtPlans(location: SiteLocation): Promise<PlansResponse> {
  void location;
  return PT_PLANS_FIXTURE;
}

export async function getClassCatalog(
  location: SiteLocation,
): Promise<ClassCatalogResponse> {
  void location;
  return CLASS_CATALOG_FIXTURE;
}

/**
 * The weekly timetable for one location.
 *
 * `fresh` exists to preserve the contract from day one: a session `id` is the
 * next real occurrence and rolls forward as occurrences pass, so it must be
 * re-read immediately before a booking call. Phase 3 depends on this argument
 * already being threaded through.
 */
export async function getClassSessions(
  location: SiteLocation,
  options: { fresh?: boolean } = {},
): Promise<ClassSessionsResponse> {
  void options;
  return classSessionsFixture(location.slug);
}

export async function getProducts(
  location: SiteLocation,
): Promise<ProductsResponse> {
  return productsFixture(location.slug);
}
