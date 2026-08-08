import "server-only";

import { getServerSupabase } from "./supabase/server";
import type { AdminUser } from "./supabase/types";

/**
 * The admin gate.
 *
 * Two things have to be true to reach /admin:
 *
 *   1. a valid Supabase Auth session, AND
 *   2. an ACTIVE row in `admin_users` for that user id.
 *
 * The second is the real gate. An auth account on its own grants nothing, and
 * `admin_users` has no INSERT or UPDATE policy for `authenticated`, so a
 * signed-in visitor cannot mint or escalate their own admin row — roster
 * changes are a service-role operation.
 *
 * This check is also enforced at the database: every admin-readable table's
 * RLS policy calls `public.is_admin()`. A UI gate alone is not enough, because
 * a determined user can call PostgREST directly with their own token.
 */

export type AdminGate =
  | { status: "unconfigured" }
  | { status: "signedOut" }
  | { status: "notAdmin"; email: string }
  | { status: "ok"; admin: AdminUser };

export async function getAdminGate(): Promise<AdminGate> {
  const supabase = await getServerSupabase();
  if (!supabase) return { status: "unconfigured" };

  // getUser() re-validates the JWT against the auth server. getSession() only
  // decodes the cookie, which is not a trust boundary.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "signedOut" };

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role, is_active, last_seen_at, created_at, updated_at")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return { status: "notAdmin", email: user.email ?? "" };
  }

  return { status: "ok", admin: data as AdminUser };
}

/** Owners and managers may edit site settings; staff are read-only. */
export function canEditSettings(admin: AdminUser): boolean {
  return admin.role === "owner" || admin.role === "manager";
}
