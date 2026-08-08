import { NextResponse } from "next/server";

import { isValidEmail, isValidIndianMobile, toE164 } from "@/lib/format";
import { MgdError, mgd } from "@/lib/mgd";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getLocations } from "@/lib/site-settings";
import { getServiceSupabase } from "@/lib/supabase/server";
import type {
  EnquiryInsert,
  EnquirySource,
  MgdSyncStatus,
} from "@/lib/supabase/types";

/**
 * POST /api/enquiries — every lead the website captures.
 *
 * Used by the Book Free Trial modal, the contact form, the homepage
 * appointment form and the PT enquiry card.
 *
 * Order of operations, and why:
 *
 *   1. Honeypot, throttle, validate — cheap rejections first, before either
 *      system is touched. The MyGymDesk API has no spam protection of its own
 *      and every endpoint shares one hourly budget per key.
 *
 *   2. MIRROR FIRST, then forward. The local row is written before the MGD
 *      call so a lead is never lost to a rate limit, a timeout, or an outage.
 *      Rows land `pending` and are replayable from the admin list.
 *
 *   3. Forward to `capture-website-lead` with the visitor's chosen branch,
 *      then stamp the outcome back onto the row.
 *
 *   4. A forwarding failure does NOT fail the request when the mirror is
 *      safe — the enquiry genuinely was received. The visitor is told the
 *      truth either way; the difference is whether the gym has to replay it.
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
        message:
          "Too many submissions. Please try again shortly, or call the gym.",
      },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  // 3. Validate. MyGymDesk silently truncates and sanitises rather than
  //    rejecting, so honest validation has to happen here.
  const name = str(payload.name, MAX_LENGTHS.name);
  if (!name || name.length < 2) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_name",
        field: "name",
        message: "Enter your full name.",
      },
      { status: 400 },
    );
  }

  const rawPhone = typeof payload.phone === "string" ? payload.phone : "";
  if (!isValidIndianMobile(rawPhone)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_phone",
        field: "phone",
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
        field: "email",
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

  // 5. Mirror first.
  const supabase = getServiceSupabase();
  const locationId =
    location && /^[0-9a-f-]{36}$/i.test(location.id) ? location.id : null;

  let mirrorId: string | null = null;
  let mirrorError: string | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("enquiries")
      .insert({ ...record, location_id: locationId })
      .select("id")
      .single();

    if (error) {
      mirrorError = error.message;
      console.error("[enquiries] mirror insert failed:", error.message);
    } else {
      mirrorId = data.id as string;
    }
  } else {
    mirrorError = "supabase service role not configured";
    console.error(
      "[enquiries] Supabase service role not configured — enquiry NOT mirrored:",
      { name: record.name, source: record.source },
    );
  }

  // 6. Forward to MyGymDesk.
  let syncStatus: MgdSyncStatus = "pending";
  let leadId: string | null = null;
  let leadAction: "created" | "updated" | null = null;
  let mgdLocationName: string | null = null;
  let mgdErrorCode: string | null = null;
  let forwardStatus = 0;

  try {
    const response = await mgd().captureLead({
      name,
      phone,
      email: email ?? undefined,
      interest: record.interest ?? undefined,
      notes: record.message ?? undefined,
      source: "website",
      source_details: record.source_page ?? undefined,
      city: location?.city,
      // *(1.4)* File the lead on the branch the visitor actually chose.
      // Our key is tenant-wide, so it may name any of the gym's branches.
      location_id: location?.mgd_location_id ?? undefined,
    });

    syncStatus = "sent";
    leadId = response.lead_id;
    leadAction = response.action;
    mgdLocationName = response.location_name;
  } catch (error) {
    syncStatus = "failed";
    if (error instanceof MgdError) {
      mgdErrorCode = error.code;
      forwardStatus = error.status;
      console.error(
        `[enquiries] MGD forward failed: ${error.status} ${error.code} — ${error.message}`,
      );
    } else {
      mgdErrorCode = "unknown";
      console.error("[enquiries] MGD forward failed:", error);
    }
  }

  // 7. Stamp the outcome onto the mirror so the admin list is honest.
  if (supabase && mirrorId) {
    const { error } = await supabase
      .from("enquiries")
      .update({
        mgd_sync_status: syncStatus,
        mgd_lead_id: leadId,
        mgd_synced_at: syncStatus === "sent" ? new Date().toISOString() : null,
        mgd_error:
          syncStatus === "failed"
            ? `${forwardStatus || ""} ${mgdErrorCode ?? ""}`.trim()
            : null,
      })
      .eq("id", mirrorId);

    if (error) {
      console.error("[enquiries] status stamp failed:", error.message);
    }
  }

  // 8. Answer the visitor.
  //
  // Success when EITHER system took it: a mirrored lead is a real lead the gym
  // can work, and a lead in MyGymDesk is the system of record. Only a double
  // failure is a genuine failure.
  const captured = syncStatus === "sent" || mirrorId !== null;

  if (!captured) {
    return NextResponse.json(
      {
        ok: false,
        error: "capture_failed",
        message:
          "We couldn't submit that just now. Please call the gym and we'll take your details.",
        detail: mirrorError,
      },
      { status: 502 },
    );
  }

  // Surface the branch MyGymDesk actually filed against — it confirms the
  // location_id took effect, and it is what the success screen quotes.
  return NextResponse.json({
    ok: true,
    id: mirrorId,
    lead_id: leadId,
    action: leadAction,
    location_name: mgdLocationName ?? location?.name ?? null,
    // Tells the client the gym has it, even if our own mirror hiccuped.
    synced: syncStatus === "sent",
  });
}
