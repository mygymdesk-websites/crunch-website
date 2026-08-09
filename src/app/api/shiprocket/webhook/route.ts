import { NextResponse } from "next/server";

/**
 * RETIRED — this endpoint moved to `/api/shipping/webhook`.
 *
 * The courier's panel refuses to accept a webhook URL containing their own
 * name, so the route had to be renamed to something vendor-neutral.
 *
 * 410 rather than a redirect, deliberately. This path was never registered
 * anywhere — the integration's credentials had not arrived when it was
 * renamed — so there is no sender to keep working, and a webhook that answers
 * 410 tells its sender to stop rather than quietly accepting events at an
 * address nobody maintains. A redirect would also be a coin flip: plenty of
 * webhook senders do not follow one on POST, and the ones that do would hide
 * the misconfiguration instead of surfacing it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GONE = {
  ok: false,
  error: "endpoint_moved",
  message: "This webhook has moved to /api/shipping/webhook.",
} as const;

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

/** Panels often probe with a GET before saving. Give them the same answer. */
export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}
