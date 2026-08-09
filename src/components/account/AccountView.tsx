"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Spinner, SuccessMark } from "@/components/ui/Modal";
import { Heading } from "@/components/ui/Primitives";
import { MyOrders } from "@/components/account/MyOrders";
import { isValidEmail } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Phase = "loading" | "signedOut" | "sending" | "codeSent" | "verifying" | "signedIn";

/**
 * Sign In / My Orders.
 *
 * SCOPE NOTE: the SoW is explicit that the website does NOT do member
 * self-service — that is the Member App's job. Customers sign in here for ONE
 * reason: to look at their shop orders. The Claude Design export draws a fuller
 * member dashboard (Overview / Bookings / Profile tabs); those are deliberately
 * not built. See HANDOFF.md.
 *
 * COPY RULE: visitor-facing text says "the Member App", never "MyGymDesk". The
 * platform is the gym's supplier, not their customers' concern, and naming it
 * on the gym's own site co-brands them with a vendor. Internal comments and the
 * admin panel name it freely — staff do need to know where to go.
 *
 * Auth is Supabase email OTP rather than the password form the design draws,
 * because a password login means storing a credential for people who already
 * have one in the Member App.
 */
export function AccountView() {
  const { location } = useLocation();
  const supabase = getBrowserSupabase();
  const fieldId = useId();

  // With no Supabase project there is no session to look up, so start at the
  // final state rather than flashing a spinner and then setting it in an
  // effect.
  const [phase, setPhase] = useState<Phase>(supabase ? "loading" : "signedOut");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setPhase(data.session ? "signedIn" : "signedOut");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setPhase(next ? "signedIn" : "signedOut");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!supabase) {
      setError(
        "Sign-in isn't connected yet. Please call the gym for your order status.",
      );
      return;
    }

    setError(null);
    setPhase("sending");

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Order viewing only — no self-serve account creation on the website.
      options: { shouldCreateUser: true },
    });

    if (otpError) {
      setError(otpError.message);
      setPhase("signedOut");
      return;
    }
    setPhase("codeSent");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setError(null);
    setPhase("verifying");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message);
      setPhase("codeSent");
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-[440px] rounded-[16px] border border-line bg-surface p-[clamp(26px,4vw,38px)]">
        <Spinner label="Checking your session…" />
      </div>
    );
  }

  if (phase === "signedIn" && session) {
    return <SignedIn email={session.user.email ?? ""} onSignOut={signOut} />;
  }

  return (
    <div className="mx-auto w-full max-w-[440px] rounded-[16px] border border-line bg-surface p-[clamp(26px,4vw,38px)]">
      {phase === "sending" || phase === "verifying" ? (
        <Spinner
          label={phase === "sending" ? "Sending your code…" : "Signing you in…"}
        />
      ) : phase === "codeSent" ? (
        <form onSubmit={verifyCode} noValidate>
          <SuccessMark />
          <Heading as="h1" size="card" className="mb-1.5 text-center !text-[24px]">
            Check your email
          </Heading>
          <p className="mx-auto m-0 mb-[22px] max-w-[38ch] text-center text-[14px] leading-[1.6] text-muted">
            We sent a 6-digit code to <b className="text-text">{email}</b>. It
            is valid for one hour.
          </p>

          <div className="grid gap-3">
            <Input
              id={`${fieldId}-code`}
              label="6-digit code"
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              error={error}
            />
            <Button type="submit" block>
              Sign in
            </Button>
            <Button
              variant="outline"
              size="sm"
              block
              onClick={() => {
                setPhase("signedOut");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={sendCode} noValidate>
          <Heading as="h1" size="card" className="mb-1.5 !text-[26px]">
            Sign in to your orders
          </Heading>
          <p className="m-0 mb-[22px] text-[14px] text-muted">
            Track a shop order and download its GST invoice. We&rsquo;ll email
            you a one-time code — no password to remember.
          </p>

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
              error={error}
            />
            <Button type="submit" block>
              Email me a code
            </Button>
          </div>

          <div className="mt-6 rounded-field border border-accent bg-accent-soft p-4">
            <div className="mb-1.5 font-display text-[16px] font-semibold uppercase">
              Looking for your membership?
            </div>
            <p className="m-0 text-[13px] leading-[1.6] text-muted">
              Bookings, renewals, freezes and membership invoices all live in
              the Member App — that is where your gym account is. This sign-in
              is for shop orders only.
            </p>
          </div>

          <p className="m-0 mt-4 text-center text-[11px] leading-[1.6] text-muted">
            Not a member yet?{" "}
            <Link href="/packages" className="border-b border-accent text-accent">
              See packages
            </Link>{" "}
            or drop into {location.short_name}.
          </p>
        </form>
      )}
    </div>
  );
}

/**
 * The signed-in view: order history, read from the fulfilment mirror.
 *
 * Scoping is RLS's job, not this component's — see `MyOrders`.
 */
function SignedIn({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const { location } = useLocation();
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-content flex-wrap items-center gap-4 px-5 pt-8">
          <span
            aria-hidden="true"
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-accent font-display text-[22px] font-semibold text-accent-ink"
          >
            {initials}
          </span>
          <span className="min-w-0 flex-auto">
            <span className="block font-display text-[clamp(24px,3.2vw,34px)] font-semibold uppercase leading-[1.05]">
              My orders
            </span>
            <span className="mt-[3px] block text-[13px] text-muted">
              {email} · {location.name}
            </span>
          </span>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
        <div className="mx-auto w-full max-w-content px-5 pt-[22px]">
          <span className="inline-block border-b-[3px] border-accent px-4 py-3 text-[12px] font-bold uppercase tracking-[.08em]">
            Orders
          </span>
        </div>
      </section>

      <div className="mx-auto w-full max-w-content px-5 py-9">
        <MyOrders locationName={location.short_name} />

        <div className="mt-4 rounded-[16px] border border-accent bg-accent-soft p-6">
          <div className="mb-1.5 font-display text-[19px] font-semibold uppercase">
            Get the Member App
          </div>
          <p className="m-0 text-[13px] leading-[1.6] text-muted">
            Book classes, freeze your plan and download membership invoices
            without calling the desk. Your gym account lives there, not here.
          </p>
        </div>
      </div>
    </>
  );
}
