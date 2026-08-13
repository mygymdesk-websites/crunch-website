"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Modal";
import { Heading } from "@/components/ui/Primitives";
import { TRANSPORT_MESSAGE, isTransportFailure } from "@/lib/auth-errors";
import { isValidEmail } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Phase = "signIn" | "working" | "forgot" | "sent";

/**
 * Admin sign-in — email and password.
 *
 * Signing in here does NOT grant admin access on its own. The session only
 * gets past `getAdminGate()` if the user also has an active `admin_users` row,
 * and every admin table's RLS calls `is_admin()` regardless of what this screen
 * does. Password auth changes who can prove they own an inbox; it changes
 * nothing about who is on the roster.
 *
 * NO ACCOUNT ENUMERATION. Every failure — unknown email, wrong password,
 * disabled account — produces the same sentence, and "forgot password" reports
 * success whether or not the address exists. A sign-in form that says "no such
 * account" is a free membership oracle for anyone with a word list.
 *
 * Accounts are provisioned deliberately (service role inserts the auth user and
 * the `admin_users` row); there is no sign-up, so a password is only ever set
 * through the recovery link.
 */
export function AdminSignIn({ notice }: { notice?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getBrowserSupabase();
  const fieldId = useId();

  // Set by /auth/callback when a recovery link could not be exchanged. Worth
  // saying out loud: otherwise a stale link silently returns you to sign-in
  // and looks like the link did nothing.
  const linkNotice =
    params.get("auth") === "link_expired"
      ? "That reset link has expired or has already been used. Request a new one below."
      : params.get("auth") === "link_invalid"
        ? "That reset link was incomplete. Request a new one below."
        : null;

  const [phase, setPhase] = useState<Phase>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** One sentence for every failure mode, on purpose. */
  const NEUTRAL = "Those details don't match an account.";

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase isn't configured for this deployment yet.");
      return;
    }
    if (!isValidEmail(email) || password.length === 0) {
      setError(NEUTRAL);
      return;
    }

    setError(null);
    setPhase("working");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // A request that never reached the server says nothing about the
      // credentials, and blaming them sends people to reset a password that
      // was always fine. Only a real rejection gets the neutral message.
      if (isTransportFailure(signInError)) {
        setError(TRANSPORT_MESSAGE);
        setPhase("signIn");
        return;
      }
      // Otherwise deliberately ignore the specific reason. Supabase
      // distinguishes "invalid credentials" from "email not confirmed"; the
      // visitor does not need that distinction and an attacker must not.
      setError(NEUTRAL);
      setPassword("");
      setPhase("signIn");
      return;
    }

    // Re-run the server-side gate. A valid session is not admin access.
    router.refresh();
  }

  async function sendReset(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase isn't configured for this deployment yet.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setPhase("working");

    // Whether the address exists is deliberately discarded — reporting it
    // would reintroduce the enumeration leak through the back door. A
    // transport failure is different: nothing was sent, so saying "check your
    // email" would be a lie.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );

    if (isTransportFailure(resetError)) {
      setError(TRANSPORT_MESSAGE);
      setPhase("forgot");
      return;
    }

    setPhase("sent");
  }

  if (phase === "working") {
    return (
      <Shell>
        <Spinner label="One moment…" />
      </Shell>
    );
  }

  if (phase === "sent") {
    return (
      <Shell>
        <Heading as="h1" size="card" className="mb-1.5 !text-[24px]">
          Check your email
        </Heading>
        <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
          If <b className="text-text">{email}</b> has an admin account, a link
          to set a new password is on its way. It expires in an hour.
        </p>
        <Button
          variant="outline"
          block
          onClick={() => {
            setPhase("signIn");
            setError(null);
          }}
        >
          Back to sign in
        </Button>
      </Shell>
    );
  }

  if (phase === "forgot") {
    return (
      <Shell>
        <Heading as="h1" size="card" className="mb-1.5 !text-[26px]">
          Reset your password
        </Heading>
        <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
          We&rsquo;ll email you a link to set a new one.
        </p>
        <form onSubmit={sendReset} noValidate>
          <div className="grid gap-3">
            <Input
              id={`${fieldId}-forgot-email`}
              label="Email address"
              placeholder="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />
            <Button type="submit" block>
              Send reset link
            </Button>
            <Button
              variant="outline"
              size="sm"
              block
              onClick={() => {
                setPhase("signIn");
                setError(null);
              }}
            >
              Back to sign in
            </Button>
          </div>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={signIn} noValidate>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
          Crunch admin
        </div>
        <Heading as="h1" size="card" className="mb-1.5 !text-[26px]">
          Sign in
        </Heading>
        <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
          Site settings and website enquiries. Gym operations — members, classes,
          billing — stay in the Member App.
        </p>

        {notice || linkNotice ? (
          <div className="mb-4 rounded-field border border-accent bg-accent-soft p-3.5 text-[13px] leading-[1.6]">
            {notice ?? linkNotice}
          </div>
        ) : null}

        <div className="grid gap-3">
          <Input
            id={`${fieldId}-email`}
            label="Email address"
            placeholder="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id={`${fieldId}-password`}
            label="Password"
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />
          <Button type="submit" block>
            Sign in
          </Button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => {
          setPhase("forgot");
          setError(null);
          setPassword("");
        }}
        className="mt-4 w-full cursor-pointer border-0 bg-transparent text-[12px] text-muted underline"
      >
        Forgot password?
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-[420px] place-items-center px-5 py-16">
      <div className="w-full rounded-[16px] border border-line bg-surface p-[clamp(26px,4vw,36px)]">
        {children}
      </div>
    </div>
  );
}
