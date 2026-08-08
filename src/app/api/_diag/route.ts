import { NextResponse } from "next/server";

import { mgd } from "@/lib/mgd";
import { getPublicSupabase } from "@/lib/supabase/server";

/**
 * TEMPORARY diagnostic route — Phase 3 Part 2 only. Remove before merge.
 *
 * The production build showed a flat ~7.3s TTFB on every dynamic route while
 * static assets served in 0.4s, which puts the cost inside the function rather
 * than on the network. Vercel's runtime logs for this project are not reachable
 * from here, so this measures each server-side dependency from INSIDE the
 * function and reports durations only.
 *
 * Emits no data, no keys, no rows — just milliseconds and the execution region.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function time<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ label: string; ms: number; ok: boolean; note?: string }> {
  const started = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - started;
    const note = Array.isArray(result)
      ? `array(${result.length})`
      : typeof result === "object" && result !== null
        ? Object.keys(result as object).slice(0, 3).join(",")
        : undefined;
    return { label, ms, ok: true, note };
  } catch (error) {
    return {
      label,
      ms: Date.now() - started,
      ok: false,
      note: error instanceof Error ? error.message.slice(0, 120) : String(error),
    };
  }
}

export async function GET() {
  const total = Date.now();
  const steps = [];

  // 1. Cold DNS/TLS to the client Supabase, unauthenticated.
  steps.push(
    await time("supabase: HEAD /rest/v1/", async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
        { cache: "no-store" },
      );
      return { status: res.status };
    }),
  );

  // 2. The actual location read every single page performs.
  steps.push(
    await time("supabase: site_settings_public", async () => {
      const sb = getPublicSupabase();
      if (!sb) throw new Error("supabase not configured");
      const { data, error } = await sb
        .from("site_settings_public")
        .select("id,slug,short_name")
        .order("display_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
  );

  // 3. Same call again — shows whether connection reuse helps.
  steps.push(
    await time("supabase: site_settings_public (2nd)", async () => {
      const sb = getPublicSupabase();
      if (!sb) throw new Error("supabase not configured");
      const { data } = await sb.from("site_settings_public").select("id");
      return data ?? [];
    }),
  );

  // 4. A cached MGD display read.
  steps.push(
    await time("mgd: website-classes catalog", () => mgd().getClassCatalog()),
  );

  // 5. An uncached MGD read.
  steps.push(
    await time("mgd: website-classes sessions (fresh)", () =>
      mgd().getClassSessions({ fresh: true }),
    ),
  );

  return NextResponse.json(
    {
      region: process.env.VERCEL_REGION ?? "unknown",
      totalMs: Date.now() - total,
      steps,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
