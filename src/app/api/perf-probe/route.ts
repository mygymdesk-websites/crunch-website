import { NextResponse } from "next/server";

import { mgd } from "@/lib/mgd";
import { getLocations } from "@/lib/site-settings";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * TEMPORARY diagnostic — Phase 3 Part 2. Delete once the render cost is found.
 *
 * Every dynamic route serves in ~7.2s while a 405 from a route handler on the
 * same deployment serves in 332ms, so the cost is inside the render. Caching
 * the location read and moving the function to bom1 changed nothing, which
 * points at the read FAILING rather than being slow — a failed fetch is not
 * cached and is not helped by geography.
 *
 * This times the Supabase hop from inside the function. It returns durations,
 * status codes and the region only: no rows, no keys, no environment values.
 * Gated on a query token so it is not a public endpoint.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Error identity without any environment value that may be embedded in it. */
function redact(error: unknown): string {
  if (!(error instanceof Error)) return "non-error thrown";
  const firstLine = error.message.split("
")[0] ?? "";
  const shape = firstLine
    .replace(/eyJ[A-Za-z0-9._-]+/g, "<jwt>")
    .replace(/[A-Z_]+=\S+/g, "<env-assignment>")
    .slice(0, 120);
  return `${error.name}: ${shape}`;
}

async function time<T>(label: string, fn: () => Promise<T>) {
  const started = Date.now();
  try {
    const result = await fn();
    return { label, ms: Date.now() - started, ok: true, ...result };
  } catch (error) {
    return {
      label,
      ms: Date.now() - started,
      ok: false,
      // Redacted: the failure mode here embeds the offending env VALUE in the
      // message. Report the shape of the error, never its contents.
      error: redact(error),
    };
  }
}

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("probe") !== "zz-perf") {
    return new NextResponse("Not found", { status: 404 });
  }

  const host = (() => {
    try {
      return new URL(SUPABASE_URL).host;
    } catch {
      return "unparseable";
    }
  })();

  const steps = [];

  // 1. Bare TCP/TLS reachability of the Supabase host, no query.
  steps.push(
    await time("supabase root", async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: SUPABASE_ANON_KEY },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      return { status: res.status };
    }),
  );

  // 2. The exact read every page performs, uncached.
  steps.push(
    await time("site_settings_public (uncached)", async () => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/site_settings_public?select=id&limit=1`,
        {
          headers: { apikey: SUPABASE_ANON_KEY },
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        },
      );
      const rows = (await res.json().catch(() => null)) as unknown[] | null;
      return { status: res.status, rowCount: Array.isArray(rows) ? rows.length : null };
    }),
  );

  // 3. Same read again — shows whether connection reuse helps.
  steps.push(
    await time("site_settings_public (2nd)", async () => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/site_settings_public?select=id&limit=1`,
        {
          headers: { apikey: SUPABASE_ANON_KEY },
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        },
      );
      return { status: res.status };
    }),
  );

  // 4. The MyGymDesk host, for comparison. Unauthenticated on purpose — a 401
  //    is a perfectly good answer here; we only care how long the hop takes.
  steps.push(
    await time("mgd host reachability", async () => {
      const res = await fetch(`${process.env.MGD_API_BASE}/website-classes`, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      return { status: res.status };
    }),
  );

  // 5. The actual function every page's layout awaits.
  steps.push(
    await time("getLocations() [real]", async () => {
      const rows = await getLocations();
      return { count: rows.length, firstSlug: rows[0]?.slug ?? null };
    }),
  );

  // 6. Second call — cache/dedupe behaviour.
  steps.push(
    await time("getLocations() [2nd]", async () => {
      const rows = await getLocations();
      return { count: rows.length };
    }),
  );

  // 7. A cached MyGymDesk display read, as the class pages perform it.
  steps.push(
    await time("mgd getClassCatalog() [real]", async () => {
      const res = await mgd().getClassCatalog();
      return { types: res?.classTypes?.length ?? null };
    }),
  );

  return NextResponse.json(
    { region: process.env.VERCEL_REGION ?? "unknown", supabaseHost: host, steps },
    { headers: { "cache-control": "no-store" } },
  );
}
