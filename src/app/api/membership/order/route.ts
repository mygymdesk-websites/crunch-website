import { NextResponse } from "next/server";

import { isValidEmail, isValidIndianMobile, toE164 } from "@/lib/format";
import { MgdError, mgd } from "@/lib/mgd";
import { humanizeMgdError } from "@/lib/mgd/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/membership/order — start a membership purchase.
 *
 * Mints the gateway order server-side so the amount comes from the gym's plan
 * data and never from the browser.
 *
 * TODAY THIS RETURNS 503. No gateway is connected yet, so the upstream answers
 * `503 gateway_not_configured`; the code travels intact so the modal renders
 * its designed "launching soon" step. When the client's Razorpay credentials
 * land, this route starts returning orders and nothing else changes.
 *
 * Two things about the response are easy to get wrong and are normalised here:
 *   - `purchase_id` is what the finalize call takes. The Razorpay order id sits
 *     beside it under `order_id`; sending that one to finalize is a 404.
 *   - `amount` is in PAISE and may exceed the plan price when the gym charges
 *     an online-payment fee. It is the total, and it is Checkout's figure.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** This one mints an order on the gym's gateway, and shares the hourly budget. */
const LIMIT = { limit: 8, windowMs: 10 * 60 * 1000 };

export interface MembershipOrderApiResponse {
  ok: true;
  purchaseId: string;
  razorpayOrderId: string;
  /** MINOR units (paise) — Checkout's figure. */
  amount: number;
  currency: string;
  keyId: string;
  testMode: boolean;
  planName: string;
  durationDays: number;
  locationName: string | null;
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
    planId?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    startDate?: unknown;
    locationId?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "invalid_json", "Malformed request.");
  }

  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const startDate =
    typeof body.startDate === "string" && body.startDate.trim()
      ? body.startDate.trim()
      : undefined;
  const locationId =
    typeof body.locationId === "string" && body.locationId.trim()
      ? body.locationId.trim()
      : undefined;

  if (!planId) return fail(400, "invalid_plan_id", "Pick a membership plan.");
  if (name.length < 2) {
    return fail(400, "invalid_name", "Enter your full name.", { field: "name" });
  }
  // Validated here, not left to the API: a bad number should be caught before
  // a payment sheet opens, not after.
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

  const limit = rateLimit(`membership:${clientIp(request.headers)}`, LIMIT);
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
    const order = await mgd().createMembershipOrder({
      plan_id: planId,
      customer: { name, phone: toE164(phone), email },
      start_date: startDate,
      location_id: locationId,
    });

    const payload: MembershipOrderApiResponse = {
      ok: true,
      purchaseId: order.purchase_id,
      razorpayOrderId: order.order_id,
      amount: order.amount,
      currency: order.currency,
      keyId: order.key_id,
      testMode: order.test_mode,
      planName: order.plan_name,
      durationDays: order.duration_days,
      locationName: order.location_name,
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
      "We couldn't reach the gym's system. Please try again shortly.",
    );
  }
}
