import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

/**
 * GET /auth/callback — turns a recovery link into a session.
 *
 * Supabase's recovery email sends the admin here with a `code`. Exchanging it
 * server-side is what writes the auth cookies, which is what lets the rest of
 * the app (and the admin gate) see the session at all. Doing it in the browser
 * would leave the server blind on the very next render.
 *
 * Deliberately NOT under `/admin`: that subtree is gated, and someone arriving
 * to set a password has not signed in yet.
 *
 * `next` is constrained to a same-site path so this cannot be used as an open
 * redirect — an auth callback that forwards anywhere is a phishing primitive.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const requested = url.searchParams.get("next") ?? "/reset-password";

  // Same-origin, path-only. Rejects "//evil.com" and "https://evil.com" alike.
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/reset-password";

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(new URL("/admin?auth=unconfigured", url.origin));
  }

  // Two ways in.
  //
  // `code` is what Supabase's own redirect delivers, and it depends on the
  // project's Site URL / redirect allow-list being correct.
  //
  // `token_hash` is redeemed HERE instead, against the proxied custom domain,
  // so the whole round trip stays on our domain. That matters in India: the
  // link Supabase puts in its emails points at the raw *.supabase.co host,
  // which several ISPs block — the same reason the app never talks to that
  // host directly. A recovery rail that a chunk of users cannot click is not
  // a recovery rail.
  const result = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : null;

  if (!result) {
    return NextResponse.redirect(new URL("/admin?auth=link_invalid", url.origin));
  }
  if (result.error) {
    // Expired or already-used link. Say so on the sign-in screen rather than
    // dropping someone on a password form that cannot work.
    return NextResponse.redirect(new URL("/admin?auth=link_expired", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
