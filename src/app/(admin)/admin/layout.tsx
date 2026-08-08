import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { getAdminGate } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Every /admin route renders through this gate.
 *
 * Enforced server-side before any admin UI is sent to the browser, so a
 * non-admin never receives the markup at all — and, more importantly, the
 * database enforces the same rule independently via `is_admin()` in RLS.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await getAdminGate();

  if (gate.status === "unconfigured") {
    return (
      <AdminSignIn notice="This deployment has no Supabase project connected yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then apply the migrations in supabase/migrations." />
    );
  }

  if (gate.status === "signedOut") {
    return <AdminSignIn />;
  }

  if (gate.status === "notAdmin") {
    // Signed in, but not on the roster. Say so plainly rather than pretending
    // the page doesn't exist — this is nearly always a real colleague whose
    // admin_users row hasn't been created.
    return (
      <AdminSignIn
        notice={`${gate.email} is signed in, but has no admin access. An owner needs to add an admin_users row for this account.`}
      />
    );
  }

  return <AdminShell admin={gate.admin}>{children}</AdminShell>;
}
