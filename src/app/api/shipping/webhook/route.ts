import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";

/**
 * POST /api/shipping/webhook — courier status pushes.
 *
 * PATH IS DELIBERATELY VENDOR-NEUTRAL. The courier's own panel refuses to
 * accept a webhook URL containing their name, so the route cannot be called
 * what it obviously is. The path also avoids the substrings "sr" and "kr",
 * which the same filter rejects. `src/lib/__tests__/webhook-path.test.ts`
 * pins this, because it is a constraint with no trace in the code.
 *
 * UNVERIFIED AGAINST LIVE TRAFFIC. No credentials have arrived, so this has
 * never received a real payload; the field mapping is written from the
 * published shape and the raw body is stored append-only so parsed columns can
 * be rebuilt if the mapping turns out to be wrong.
 *
 * Verification is a shared token that Shiprocket echoes in `x-api-key`. If
 * SHIPROCKET_WEBHOOK_TOKEN is unset the route refuses everything rather than
 * accepting unauthenticated writes — an open endpoint that mutates order state
 * is worse than no endpoint.
 *
 * Always answers 200 once authenticated, even on an unknown AWB: a webhook
 * that 404s gets retried forever and then disabled.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shiprocket status → our shipment_status enum. Unmapped values stay as-is. */
const STATUS_MAP: Record<string, string> = {
  "AWB ASSIGNED": "awb_assigned",
  "PICKUP SCHEDULED": "pickup_scheduled",
  "PICKED UP": "in_transit",
  "IN TRANSIT": "in_transit",
  "OUT FOR DELIVERY": "out_for_delivery",
  DELIVERED: "delivered",
  RTO: "rto",
  CANCELED: "cancelled",
  CANCELLED: "cancelled",
};

export async function POST(request: Request) {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("x-api-key") !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const awb = typeof payload.awb === "string" ? payload.awb : null;
  const rawStatus =
    typeof payload.current_status === "string" ? payload.current_status : null;

  if (!awb) {
    // Acknowledged so it is not retried, but nothing to attach it to.
    return NextResponse.json({ ok: true, matched: false });
  }

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { data: shipment } = await service
    .from("shipments")
    .select("id, status_log")
    .eq("awb", awb)
    .maybeSingle();

  if (!shipment) return NextResponse.json({ ok: true, matched: false });

  const mapped = rawStatus ? STATUS_MAP[rawStatus.toUpperCase()] : undefined;
  const log = Array.isArray(shipment.status_log) ? shipment.status_log : [];

  await service
    .from("shipments")
    .update({
      ...(mapped ? { status: mapped } : {}),
      status_detail: rawStatus,
      ...(mapped === "delivered"
        ? { delivered_at: new Date().toISOString() }
        : {}),
      status_log: [...log, { at: new Date().toISOString(), raw: payload }],
    })
    .eq("id", shipment.id);

  return NextResponse.json({ ok: true, matched: true });
}
