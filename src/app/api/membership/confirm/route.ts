import { NextResponse } from "next/server";

import { MgdError, mgd } from "@/lib/mgd";
import { humanizeMgdError } from "@/lib/mgd/errors";

/**
 * POST /api/membership/confirm — finalize after Razorpay has captured.
 *
 * MyGymDesk verifies the capture against the gym's own gateway and re-resolves
 * the amount before provisioning anything, so a forged or replayed capture
 * creates nothing. It then makes the member, an active subscription, the
 * invoice, and Member App access.
 *
 * DELIBERATELY NOT RATE-LIMITED. The upstream is budget-exempt for exactly
 * this reason: by the time we are here the customer's money is gone, and a
 * throttle would strand a paid purchase with nothing to show for it. The same
 * logic makes retrying safe — replaying a capture returns the original result
 * with `idempotent: true` rather than charging or provisioning twice, so a
 * network drop after capture is recoverable by simply calling again.
 *
 * NOT YET EXERCISABLE END-TO-END: reaching it needs a real capture, which
 * needs a gateway the client has not connected. It is written and typed now so
 * switching the gateway on is a resume; the confirm handler is unit-tested
 * against recorded v1.6 response shapes instead.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MembershipConfirmApiResponse {
  ok: true;
  memberId: string;
  subscriptionId: string;
  planName: string;
  /** ISO. Surfaced prominently — for a renewal this is the whole story. */
  startDate: string;
  endDate: string;
  amountCharged: number;
  currency: string;
  invoiceNumber: string | null;
  memberAppProvisioned: boolean;
  locationName: string | null;
  /** True when this capture had already been finalized. Still a success. */
  alreadyConfirmed: boolean;
}

function fail(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export async function POST(request: Request) {
  let body: {
    purchaseId?: unknown;
    payment?: { orderId?: unknown; captureId?: unknown; signature?: unknown };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "invalid_json", "Malformed request.");
  }

  const purchaseId =
    typeof body.purchaseId === "string" ? body.purchaseId.trim() : "";
  const orderId =
    typeof body.payment?.orderId === "string" ? body.payment.orderId : "";
  const captureId =
    typeof body.payment?.captureId === "string" ? body.payment.captureId : "";
  const signature =
    typeof body.payment?.signature === "string"
      ? body.payment.signature
      : undefined;

  if (!purchaseId) return fail(400, "invalid_order_id", "Missing purchase.");
  if (!orderId || !captureId) {
    return fail(400, "invalid_capture_id", "Missing payment details.");
  }

  try {
    // The field is named order_id but takes the PURCHASE id, not the Razorpay
    // order id — those are two different values in the same order response.
    const result = await mgd().purchaseMembership({
      order_id: purchaseId,
      payment: {
        gateway: "razorpay",
        order_id: orderId,
        capture_id: captureId,
        signature,
      },
    });

    const payload: MembershipConfirmApiResponse = {
      ok: true,
      memberId: result.member_id,
      subscriptionId: result.subscription_id,
      planName: result.plan_name,
      startDate: result.start_date,
      endDate: result.end_date,
      amountCharged: result.amount_charged,
      currency: result.currency,
      invoiceNumber: result.invoice_number,
      memberAppProvisioned: Boolean(result.member_portal?.provisioned),
      locationName: result.location_name,
      alreadyConfirmed: Boolean(result.idempotent),
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MgdError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 502;
      // Money has moved by now. None of this copy may suggest "just try again"
      // in a way that reads as "pay again".
      return fail(status, error.code, humanizeMgdError(error));
    }
    return fail(
      502,
      "network_error",
      "Your payment went through but we couldn't confirm the membership. " +
        "Please call the gym — do not pay again.",
    );
  }
}
