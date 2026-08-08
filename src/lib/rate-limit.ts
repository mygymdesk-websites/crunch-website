import "server-only";

/**
 * A small fixed-window rate limiter for the public form endpoints.
 *
 * The MyGymDesk API has no spam protection of its own ("There's no built-in
 * spam protection — add your own honeypot/CAPTCHA"), and every MGD endpoint
 * shares one hourly budget per key. So the throttle has to live here.
 *
 * Deliberately in-memory: it is per-instance, which means a horizontally
 * scaled deployment enforces N× the limit. That is an acceptable Phase 1
 * trade — combined with the honeypot it stops the casual bot flood, and the
 * real defence for a determined attacker is the MGD-side rate limit plus
 * (Phase 2) a CAPTCHA. Swap this for Upstash/Redis if abuse shows up.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

/** Stop the Map growing without bound on a long-lived instance. */
function sweep(now: number): void {
  if (buckets.size < 5_000) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds,
  };
}

/**
 * Best-effort client IP.
 *
 * Behind Vercel, `x-forwarded-for` is set by the platform and its first entry
 * is the real client. Anywhere else it is spoofable, which is another reason
 * this limiter is a speed bump rather than a security control.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
