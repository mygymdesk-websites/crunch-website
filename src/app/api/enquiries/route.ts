import { NextResponse } from "next/server";

import { isValidEmail, isValidIndianMobile, toE164 } from "@/lib/format";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getLocations } from "@/lib/site-settings";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { EnquiryInsert, EnquirySource } from "@/lib/supabase/types";

/**
 * POST /api/enquiries — every lead the website captures.
 *
 * Used by the Book Free Trial modal, the contact form, the homepage
 * appointment form and the PT enquiry card.
 *
 * PHASE 1 SCOPE: writes the `enquiries` mirror only.
 * PHASE 2 adds the MyGymDesk forward (`capture-website-lead`) at the marked
 * point below — mirror first, then forward, so a lead is never lost when MGD
 * is rate-limited or down. Rows land with mgd_sync_status='pending' and stay
 * replayable.
 *
 * The database write goes through the service role deliberately: `anon` has no
 * INSERT privilege on `enquiries`, because a public form posting straight into
 * a table is how you end up with a spam table.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCES: EnquirySource[] = [
  "contact_form",
  "trial_modal",
  "appointment_form",
  "packages_enquiry",
  "other",
];

/** Generous for a human, tight for a bot. */
const LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

const MAX_LENGTHS = {
  name: 200,
  interest: 200,
  message: 1000,
  email: 200,
  source_page: 500,
} as const;

interface Payload {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  interest?: unknown;
  message?: unknown;
  location_slug?: unknown;
  source?: unknown;
  source_page?: unknown;
  whatsapp_opt_in?: unknown;
  /** Honeypot. Any value means "bot". */
  company?: unknown;
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json", message: "Malformed request." },
      { status: 400 },
    );
  }

  // 1. Honeypot. Answer 200 so the bot believes it worked and moves on.
  if (typeof payload.company === "string" && payload.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  // 2. Throttle.
  const limit = rateLimit(`enquiry:${clientIp(request.headers)}`, LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Too many submissions. Please try again shortly, or call the gym.",
      },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  // 3. Validate. The MGD API silently truncates and sanitises rather than
  //    rejecting, so the honest validation has to happen here.
  const name = str(payload.name, MAX_LENGTHS.name);
  if (!name || name.length < 2) {
    return NextResponse.json(
      { ok: false, error: "invalid_name", message: "Enter your full name." },
      { status: 400 },
    );
  }

  const rawPhone = typeof payload.phone === "string" ? payload.phone : "";
  if (!isValidIndianMobile(rawPhone)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_phone",
        message: "Enter a valid 10-digit Indian mobile number.",
      },
      { status: 400 },
    );
  }
  const phone = toE164(rawPhone);

  const email = str(payload.email, MAX_LENGTHS.email);
  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_email",
        message: "Enter a valid email address.",
      },
      { status: 400 },
    );
  }

  const source: EnquirySource =
    typeof payload.source === "string" &&
    SOURCES.includes(payload.source as EnquirySource)
      ? (payload.source as EnquirySource)
      : "other";

  // 4. Resolve the location by slug. Never trust a client-supplied UUID.
  const locations = await getLocations();
  const requestedSlug = str(payload.location_slug, 60);
  const location =
    locations.find((l) => l.slug === requestedSlug) ??
    locations.find((l) => l.is_default) ??
    locations[0];

  const record: EnquiryInsert = {
    name,
    phone,
    email,
    interest: str(payload.interest, MAX_LENGTHS.interest),
    message: str(payload.message, MAX_LENGTHS.message),
    location_slug: location?.slug ?? null,
    source,
    source_page: str(payload.source_page, MAX_LENGTHS.source_page),
    referer: request.headers.get("referer"),
    whatsapp_opt_in: payload.whatsapp_opt_in !== false,
  };

  // 5. Persist the mirror.
  const supabase = getServiceSupabase();

  if (!supabase) {
    // The client's Supabase project isn't wired up yet. Fail loudly in the
    // log, but do not tell the visitor their enquiry vanished — surface it as
    // a real error so the form shows the "call us" fallback.
    console.error(
      "[enquiries] Supabase service role not configured — enquiry NOT stored:",
      { name: record.name, phone: record.phone, source: record.source },
    );
    return NextResponse.json(
      {
        ok: false,
        error: "not_configured",
        message:
          "We couldn't submit that just now. Please call the gym and we'll take your details.",
      },
      { status: 503 },
    );
  }

  // location_id is resolved server-side from the slug, so a forged id can't
  // file a lead against the wrong branch. In seed-fallback mode the location
  // has no database UUID, so only the slug snapshot is stored.
  const locationId =
    location && /^[0-9a-f-]{36}$/i.test(location.id) ? location.id : null;

  const { data, error } = await supabase
    .from("enquiries")
    .insert({ ...record, location_id: locationId })
    .select("id")
    .single();

  if (error) {
    console.error("[enquiries] insert failed:", error.message);
    return NextResponse.json(
      {
        ok: false,
        error: "storage_failed",
        message:
          "We couldn't submit that just now. Please try again, or call the gym.",
      },
      { status: 502 },
    );
  }

  // ── PHASE 2 ────────────────────────────────────────────────────────────
  // Forward to MyGymDesk, then stamp the result back onto this row:
  //
  //   try {
  //     const res = await mgd().captureLead({
  //       name, phone, email: email ?? undefined,
  //       interest: record.interest ?? undefined,
  //       notes: record.message ?? undefined,
  //       source: "website",
  //       source_details: record.source_page ?? undefined,
  //     });
  //     await supabase.from("enquiries")
  //       .update({ mgd_sync_status: "sent", mgd_lead_id: res.lead_id,
  //                 mgd_synced_at: new Date().toISOString() })
  //       .eq("id", data.id);
  //   } catch (e) {
  //     await supabase.from("enquiries")
  //       .update({ mgd_sync_status: "failed",
  //                 mgd_error: e instanceof MgdError ? e.code : String(e) })
  //       .eq("id", data.id);
  //     // Do NOT fail the request — the lead is safely mirrored and replayable.
  //   }
  //
  // Note: MGD files leads against the ONE branch configured on the key. Adding
  // per-request location_id is Track A item A5.
  // ───────────────────────────────────────────────────────────────────────

  return NextResponse.json({ ok: true, id: data.id });
}
