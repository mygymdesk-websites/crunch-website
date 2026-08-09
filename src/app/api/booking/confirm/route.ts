import { NextResponse } from "next/server";

import { isValidEmail, isValidIndianMobile, toE164 } from "@/lib/format";
import { MgdError, mgd } from "@/lib/mgd";
import { humanizeMgdError } from "@/lib/mgd/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/booking/confirm — record the booking AFTER Razorpay has captured.
 *
 * MyGymDesk verifies the capture against the gym's own gateway and re-resolves
 * the amount before writing anything, so a forged or replayed capture creates
 * nothing. We deliberately never send an amount or currency: the server charges
 * its own figure, and sending one is ignored at best and a bug at worst.
 *
 * NOT YET EXERCISABLE END-TO-END. Reaching this route requires a real capture,
 * which requires a gateway the client has not connected. It is written and
 * typed now so that switching the gateway on is a resume rather than a rewrite;
 * the whole payment leg is the Checkout call in `BookingModal` plus this route.
 *
 * The customer is re-validated here rather than trusted from the order step,
 * because these are two separate HTTP requests and the second one is the one
 * that creates a member record.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = { limit: 8, windowMs: 10 * 60 * 1000 };

export interface ConfirmResponse {
  ok: true;
  bookingId: string;
  status: string;
  /** Server-resolved, not what the browser thought it was paying. */
  amountCharged: number;
  currency: string;
  locationName: string | null;
}

function fail(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export async function POST(request: Request) {
  let body: {
    sessionId?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    payment?: {
      orderId?: unknown;
      captureId?: unknown;
      signature?: unknown;
    };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "invalid_json", "Malformed request.");
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const orderId =
    typeof body.payment?.orderId === "string" ? body.payment.orderId : "";
  const captureId =
    typeof body.payment?.captureId === "string" ? body.payment.captureId : "";
  const signature =
    typeof body.payment?.signature === "string"
      ? body.payment.signature
      : undefined;

  if (!sessionId) return fail(400, "invalid_session_id", "Missing session.");
  if (name.length < 2) return fail(400, "invalid_name", "Enter your full name.");
  if (!isValidIndianMobile(phone)) {
    return fail(400, "invalid_phone", "Enter a valid 10-digit mobile number.");
  }
  if (!isValidEmail(email)) {
    return fail(400, "invalid_email", "Enter a valid email address.");
  }
  if (!orderId || !captureId) {
    return fail(400, "invalid_capture_id", "Missing payment details.");
  }

  const limit = rateLimit(`confirm:${clientIp(request.headers)}`, LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Too many attempts. Please call the gym and quote your payment id.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const booking = await mgd().createClassBooking({
      session_id: sessionId,
      customer: { name, phone: toE164(phone), email },
      payment: {
        gateway: "razorpay",
        order_id: orderId,
        capture_id: captureId,
        signature,
      },
    });

    const payload: ConfirmResponse = {
      ok: true,
      bookingId: booking.booking_id,
      status: booking.status,
      amountCharged: booking.amount_charged,
      currency: booking.currency,
      locationName: booking.location_name,
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MgdError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 502;
      // Money has changed hands by the time we get here, so the copy for these
      // must never imply the customer simply retries and all is well.
      return fail(status, error.code, humanizeMgdError(error));
    }
    return fail(
      502,
      "network_error",
      "Your payment went through but we couldn't confirm the booking. " +
        "Please call the gym — do not pay again.",
    );
  }
}
