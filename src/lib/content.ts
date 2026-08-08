import "server-only";

import { MgdError, mgd } from "@/lib/mgd";
import type {
  ClassCatalogResponse,
  ClassSessionsResponse,
  MgdPlan,
  PlansResponse,
  ProductsResponse,
} from "@/lib/mgd/types";
import type { SiteLocation } from "@/lib/supabase/types";

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  THE DATA SOURCE  —  LIVE as of Phase 2
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Every page reads its plans / classes / timetable / products through this
 * module and nothing else. As of Phase 2 each function calls the MyGymDesk
 * Website API (v1.4) for real.
 *
 * Two rules hold throughout:
 *
 *   1. Location filtering goes through `mgd_location_id`, never a slug or a
 *      name. A location with no MGD branch id yet gets an UNFILTERED read
 *      rather than a guess — better to show the gym's whole catalogue than to
 *      invent a branch id and show nothing.
 *
 *   2. A failing API call NEVER takes a page down. Each reader logs and
 *      returns an empty result, and the page renders the designed empty state
 *      it already had from Phase 1. `degraded` says which happened, so a
 *      surface can distinguish "nothing published" from "we couldn't reach
 *      the gym's system" where that matters.
 */

/** Live MyGymDesk data is wired up. */
export const IS_LIVE_DATA = true;

export interface ContentResult<T> {
  data: T;
  /** True when the API call failed and this is an empty fallback. */
  degraded: boolean;
}

/**
 * Run a read, turning any API failure into an empty result.
 *
 * `location_out_of_scope` gets its own line because it is a configuration
 * mistake on our side — a branch id that the key cannot see — and it would
 * otherwise look like "this gym has no classes".
 */
async function safely<T>(
  label: string,
  empty: T,
  read: () => Promise<T>,
): Promise<ContentResult<T>> {
  try {
    return { data: await read(), degraded: false };
  } catch (error) {
    if (error instanceof MgdError) {
      if (error.code === "location_out_of_scope") {
        console.error(
          `[content] ${label}: the API key cannot see that branch. ` +
            `Check site_settings.mgd_location_id against the key's scope.`,
        );
      } else {
        console.error(
          `[content] ${label} failed: ${error.status} ${error.code} — ${error.message}`,
        );
      }
    } else {
      console.error(`[content] ${label} failed:`, error);
    }
    return { data: empty, degraded: true };
  }
}

/**
 * The MGD branch id for a location, or undefined for an unfiltered read.
 *
 * Undefined rather than a guess: an unconfigured location shows the gym's
 * whole catalogue, which is wrong-ish but useful, instead of an invented
 * filter that returns nothing or 403s.
 */
function branchOf(location: SiteLocation | undefined): string | undefined {
  return location?.mgd_location_id ?? undefined;
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

/**
 * Membership plans for the pricing cards.
 *
 * `resource=plans` merges membership plans (tenant-wide) with service packages
 * (which may be branch-scoped). A branch filter keeps all membership plans and
 * adds that branch's packages — so this is the right call for both sections.
 */
async function readPlans(location: SiteLocation): Promise<PlansResponse> {
  return mgd().getPlans({ locationId: branchOf(location) });
}

/** A service package looks like a plan but is bought as a block of sessions. */
function isServicePackage(plan: MgdPlan): boolean {
  // Membership plans are tenant-wide and always report locationId: null.
  // Service packages are the rows that carry a branch, plus the tenant-wide
  // packages — which are indistinguishable by locationId alone. The reliable
  // signal is the interval: memberships bill on a calendar period, packages
  // are a one-off block.
  return plan.interval === "custom";
}

export async function getPlans(
  location: SiteLocation,
): Promise<ContentResult<MgdPlan[]>> {
  const result = await safely("plans", { plans: [] } as PlansResponse, () =>
    readPlans(location),
  );
  return {
    data: result.data.plans.filter((p) => !isServicePackage(p)),
    degraded: result.degraded,
  };
}

/**
 * Personal-training packages.
 *
 * Sourced from the service packages inside `resource=plans` — the API doc is
 * explicit that PT *plans* are excluded from this endpoint, so if the gym
 * models PT as PT plans rather than service packages, nothing comes back.
 *
 * When there is nothing, the section hides. No fixture fallback: inventing a
 * price list on a live gym's site is worse than showing nothing.
 */
export async function getPtPlans(
  location: SiteLocation,
): Promise<ContentResult<MgdPlan[]>> {
  const result = await safely("pt plans", { plans: [] } as PlansResponse, () =>
    readPlans(location),
  );
  return {
    data: result.data.plans.filter(isServicePackage),
    degraded: result.degraded,
  };
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export async function getClassCatalog(
  location: SiteLocation,
): Promise<ContentResult<ClassCatalogResponse["classes"]>> {
  const result = await safely(
    "class catalog",
    { classes: [] } as ClassCatalogResponse,
    () => mgd().getClassCatalog({ locationId: branchOf(location) }),
  );
  return { data: result.data.classes, degraded: result.degraded };
}

/**
 * The weekly timetable for one location.
 *
 * `fresh` bypasses the 15-minute cache. It MUST be used immediately before a
 * booking call: a session `id` is the next real occurrence and rolls forward
 * as occurrences pass, so a cached id books the wrong slot or fails outright.
 * Phase 3 depends on this argument already being threaded through.
 */
export async function getClassSessions(
  location: SiteLocation,
  options: { fresh?: boolean } = {},
): Promise<ContentResult<ClassSessionsResponse["sessions"]>> {
  const result = await safely(
    "class sessions",
    { sessions: [] } as ClassSessionsResponse,
    () =>
      mgd().getClassSessions({
        locationId: branchOf(location),
        fresh: options.fresh,
      }),
  );
  return { data: result.data.sessions, degraded: result.degraded };
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

const EMPTY_PRODUCTS: ProductsResponse = {
  products: [],
  currency: "INR",
  locationId: null,
  locationName: null,
};

export async function getProducts(
  location: SiteLocation,
  options: { inStockOnly?: boolean } = {},
): Promise<ContentResult<ProductsResponse>> {
  return safely("products", EMPTY_PRODUCTS, () =>
    mgd().getProducts({
      locationId: branchOf(location),
      inStockOnly: options.inStockOnly,
    }),
  );
}
