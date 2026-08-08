/**
 * Supabase configuration + a hard answer to "is this project wired up yet?".
 *
 * The client's Supabase project may not exist when this code first runs. Every
 * data path therefore has to survive missing credentials without throwing at
 * import time — the site still has to build and render.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the public (browser-safe) credentials are present. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/**
 * True when the service-role key is present as well.
 *
 * Server-only: reading `process.env.SUPABASE_SERVICE_ROLE_KEY` from a client
 * component yields undefined, which is the correct answer there.
 */
export function isServiceRoleConfigured(): boolean {
  return (
    isSupabaseConfigured() &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0
  );
}
