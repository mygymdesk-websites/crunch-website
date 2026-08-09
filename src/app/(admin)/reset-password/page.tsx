import type { Metadata } from "next";

import { ResetPassword } from "@/components/admin/ResetPassword";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * /reset-password — where a recovery link lands after `/auth/callback` has
 * exchanged the code for a session.
 *
 * Deliberately OUTSIDE `/admin`, so it is not behind the admin gate: someone
 * setting a password for the first time has a valid auth session but may not
 * be on the roster yet, and bouncing them to the sign-in screen would make the
 * link useless. Setting a password grants nothing on its own — `admin_users`
 * is still the gate for every admin page and every RLS policy.
 */

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await getServerSupabase();
  // getUser() re-validates against the auth server; a decoded cookie is not a
  // trust boundary. No session means the link was expired, reused, or forged.
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  return <ResetPassword signedIn={Boolean(user)} />;
}
