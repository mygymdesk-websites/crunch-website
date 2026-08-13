"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Modal";
import { Heading } from "@/components/ui/Primitives";
import { TRANSPORT_MESSAGE, isTransportFailure } from "@/lib/auth-errors";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Set a new password, reached from a recovery link.
 *
 * The recovery session is established by `/auth/callback` before this renders,
 * so `updateUser` here is an authenticated write — there is no token in this
 * component and nothing to leak. Without a valid session Supabase refuses the
 * update, which is the real guard; the copy below just explains it.
 *
 * A minimum length is enforced and nothing else. Composition rules push people
 * toward `Password1!` and towards reuse; length is the property that actually
 * costs an attacker anything.
 *
 * 8 is the NIST SP 800-63B floor for a user-chosen secret. It must be mirrored
 * in Supabase → Auth → Policies: this check runs in the browser, so on its own
 * it is a suggestion that anyone calling the Auth API directly can walk around.
 * One number, enforced in both places, rather than two that drift.
 */
const MIN_LENGTH = 8;

export function ResetPassword({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const fieldId = useId();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase isn't configured for this deployment yet.");
      return;
    }
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setError(null);
    setBusy(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(
        isTransportFailure(updateError)
          ? TRANSPORT_MESSAGE
          : /same.*password/i.test(updateError.message)
          ? "That is already your password. Choose a different one."
          : "We couldn't set that password. Your reset link may have expired — request a new one.",
      );
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-[420px] place-items-center px-5 py-16">
      <div className="w-full rounded-[16px] border border-line bg-surface p-[clamp(26px,4vw,36px)]">
        {busy ? (
          <Spinner label="Saving…" />
        ) : done ? (
          <>
            <Heading as="h1" size="card" className="mb-1.5 !text-[24px]">
              Password set
            </Heading>
            <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
              You&rsquo;re signed in. Use this password next time.
            </p>
            <Button block onClick={() => router.push("/admin")}>
              Go to admin
            </Button>
          </>
        ) : !signedIn ? (
          <>
            <Heading as="h1" size="card" className="mb-1.5 !text-[24px]">
              This link has expired
            </Heading>
            <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
              Reset links are single-use and last an hour. Request a fresh one
              from the sign-in screen.
            </p>
            <Button block onClick={() => router.push("/admin")}>
              Back to sign in
            </Button>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
              Crunch admin
            </div>
            <Heading as="h1" size="card" className="mb-1.5 !text-[26px]">
              Set your password
            </Heading>
            <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
              At least {MIN_LENGTH} characters. A phrase you&rsquo;ll remember beats a
              short one with symbols in it.
            </p>
            <div className="grid gap-3">
              <Input
                id={`${fieldId}-password`}
                label="New password"
                placeholder="New password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                id={`${fieldId}-confirm`}
                label="Confirm password"
                placeholder="Confirm password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={error}
              />
              <Button type="submit" block>
                Save password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
