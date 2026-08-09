import { NextResponse } from "next/server";

import { isValidEmail, isValidIndianMobile, toE164 } from "@/lib/format";
import { MgdError, mgd } from "@/lib/mgd";
import { humanizeMgdError } from "@/lib/mgd/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/booking/order — mint the Razorpay order, server-side.
 *
 * The amount is never sent from the browser: MyGymDesk resolves it from the
 * gym's own data and returns it in PAISE, ready for Checkout.
 *
 * TODAY THIS RETURNS 503. The client hasn't connected a payment gateway yet, so
 * `website-booking-order` answers `503 gateway_not_configured`. That is passed
 * through with its code intact so the modal can render a designed
 * "booking online soon — call us" step rather than an error. When the gateway
 * lands, this route starts returning orders and nothing here changes.
 *
 * Phone is validated here rather than left to the API because MGD's booking
 * endpoint is stricter than its lead endpoint — it demands a dialable Indian
 * mobile — and a customer should learn that before a payment sheet opens, not
 * after.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tighter than the quote: this one mints an order on the gym's gateway. */
const LIMIT = { limit: 8, windowMs: 10 * 60 * 1000 };

export interface OrderResponse {
  ok: true;
  orderId: string;
  /** MINOR units (paise) — hand straight to Razorpay Checkout. */
  amount: number;
  currency: string;
  keyId: string;
  /** Drives the TEST MODE ribbon. Never inferred client-side. */
  testMode: boolean;
}

function fail(
  status: number,
  error: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ ok: false, error, message, ...extra }, { status });
}

export async function POST(request: Request) {
  let body: {
    sessionId?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
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

  if (!sessionId) {
    return fail(400, "invalid_session_id", "Pick a class from the timetable.");
  }
  if (name.length < 2) {
    return fail(400, "invalid_name", "Enter your full name.", { field: "name" });
  }
  if (!isValidIndianMobile(phone)) {
    return fail(400, "invalid_phone", "Enter a valid 10-digit mobile number.", {
      field: "phone",
    });
  }
  if (!isValidEmail(email)) {
    return fail(400, "invalid_email", "Enter a valid email address.", {
      field: "email",
    });
  }

  const limit = rateLimit(`order:${clientIp(request.headers)}`, LIMIT);
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
    const order = await mgd().createBookingOrder({
      session_id: sessionId,
      booking_type: "class",
      // Stamped onto the gateway order so the gym can match a payment to a
      // person in their Razorpay dashboard. It does NOT prefill Checkout —
      // that happens in the browser, from the values we already hold.
      customer: { name, phone: toE164(phone), email },
    });

    const payload: OrderResponse = {
      ok: true,
      orderId: order.order_id,
      amount: order.amount,
      currency: order.currency,
      keyId: order.key_id,
      testMode: order.test_mode,
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MgdError) {
      // gateway_not_configured / gateway_reconnect_required are not failures to
      // apologise for — they mean online payment is not switched on. The code
      // travels intact so the modal can branch to its designed state.
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
