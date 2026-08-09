import { NextResponse } from "next/server";

import { MgdError, mgd } from "@/lib/mgd";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { humanizeMgdError } from "@/lib/mgd/errors";

/**
 * POST /api/booking/quote — resolve a bookable session and its real price.
 *
 * Step one of the booking flow, and the reason the flow has a server side at
 * all beyond hiding the key.
 *
 * THE SESSION ID ROLLS FORWARD. `website-classes` returns a weekly TEMPLATE,
 * and each row's `id` is its next real occurrence — so the id baked into a
 * timetable the visitor has had on screen for ten minutes may already point at
 * an occurrence that has run. Booking that id books the wrong day or fails
 * outright. So the client sends the STABLE `templateKey` and this route
 * re-resolves the current id from a `fresh` read, immediately before quoting.
 *
 * `templateKey` is `dayOfWeek-startTime-classTypeId`, which is NOT unique on
 * its own: the same class type at the same hour on the same weekday at two
 * branches produces the same key. It is only unique WITH the branch, so the
 * match is on both.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A quote is cheap, but every read shares one hourly budget for the gym. */
const LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

export interface QuoteResponse {
  ok: true;
  /** The CURRENT occurrence id. Short-lived — pass it straight to /order. */
  sessionId: string;
  name: string;
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  instructorName: string | null;
  spotsLeft: number;
  spotsTotal: number;
  /** Major units (rupees), from the authoritative price endpoint. */
  amount: number;
  currency: string;
  locationName: string | null;
}

function fail(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export async function POST(request: Request) {
  let body: { templateKey?: unknown; locationId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "invalid_json", "Malformed request.");
  }

  const templateKey =
    typeof body.templateKey === "string" ? body.templateKey.trim() : "";
  const locationId =
    typeof body.locationId === "string" ? body.locationId.trim() : "";

  if (!templateKey) {
    return fail(400, "invalid_body", "Pick a class from the timetable.");
  }

  const limit = rateLimit(`quote:${clientIp(request.headers)}`, LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Too many attempts. Please try again shortly, or call the gym.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    // `fresh: true` is the whole point — a cached read defeats the re-resolve.
    const { sessions } = await mgd().getClassSessions({
      locationId: locationId || undefined,
      fresh: true,
    });

    const session = sessions.find(
      (s) =>
        s.templateKey === templateKey &&
        // Only compare branches when we were told one; a tenant-wide key can
        // return branchless sessions where locationId is null.
        (!locationId || s.locationId === locationId),
    );

    if (!session) {
      return fail(
        409,
        "session_not_found",
        "That slot is no longer on the timetable. Pick another one.",
      );
    }

    // Treat at-or-over capacity as full: spotsBooked can under-report.
    const spotsLeft = Math.max(0, session.spotsTotal - session.spotsBooked);
    if (session.spotsBooked >= session.spotsTotal) {
      return fail(
        409,
        "slot_full",
        "That class just filled up. Nothing has been charged.",
      );
    }

    // The authoritative amount. The session row carries a price too, but the
    // booking charges what THIS endpoint says, so quote what will be charged.
    const price = await mgd().getSessionPrice({
      sessionId: session.id,
      bookingType: "class",
    });

    // valid:false arrives as HTTP 200 — branch on the field, not the status.
    if (!price.valid) {
      return fail(
        409,
        "session_not_priced",
        "This class has no price set yet. Call the desk and we'll book you in.",
      );
    }

    const payload: QuoteResponse = {
      ok: true,
      sessionId: session.id,
      name: session.name,
      dayOfWeek: session.dayOfWeek,
      startTime: session.startTime,
      durationMin: session.durationMin,
      instructorName: session.instructorName,
      spotsLeft,
      spotsTotal: session.spotsTotal,
      amount: price.amount,
      currency: price.currency,
      locationName: session.locationName,
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MgdError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 502;
      return fail(status, error.code, humanizeMgdError(error));
    }
    return fail(
      502,
      "network_error",
      "We couldn't reach the gym's booking system. Please try again shortly.",
    );
  }
}
