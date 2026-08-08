import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isServiceRoleConfigured,
  isSupabaseConfigured,
} from "./config";

/**
 * Request-scoped Supabase client that carries the visitor's auth cookies.
 *
 * Use this for anything that must respect RLS as the signed-in user: the admin
 * panel, "My Orders", the admin gate.
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled in middleware, so this is safe to skip.
        }
      },
    },
  });
}

/**
 * Anonymous, cookie-less client for public reads (locations, policies).
 *
 * Cheaper than the cookie-bound client and, more importantly, cacheable —
 * nothing about the response varies per visitor.
 *
 * `cache` puts the underlying REST call into Next's data cache. That matters
 * more than it looks: the location read runs on EVERY page render (header,
 * footer, metadata), and the database is in Mumbai while the function may run
 * elsewhere, so an uncached read is a cross-region round trip on every single
 * request. Cached, almost every request does no database work at all.
 *
 * Invalidated by tag when an admin saves site settings, so it is never stale
 * in a way anyone notices.
 */
export function getPublicSupabase(
  cache?: { revalidate: number; tags: string[] },
): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: cache
      ? {
          fetch: (input, init) =>
            fetch(input as RequestInfo, {
              ...init,
              next: { revalidate: cache.revalidate, tags: cache.tags },
            } as RequestInit),
        }
      : undefined,
  });
}

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * ONLY for route handlers that must write on the visitor's behalf without
 * granting the visitor any table privilege — enquiry inserts today, shop-order
 * mirroring in Phase 5. Never import this from a client component; the
 * `server-only` guard at the top of this file turns that into a build error.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (!isServiceRoleConfigured()) return null;
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
