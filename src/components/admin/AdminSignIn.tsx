"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Modal";
import { Heading } from "@/components/ui/Primitives";
import { isValidEmail } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Phase = "email" | "sending" | "code" | "verifying";

/**
 * Admin sign-in — Supabase email OTP.
 *
 * Signing in here does NOT grant admin access on its own. The session only
 * gets past `getAdminGate()` if the user also has an active `admin_users`
 * row, and every admin table's RLS calls `is_admin()` regardless of what this
 * screen does.
 */
export function AdminSignIn({ notice }: { notice?: string }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const fieldId = useId();

  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!supabase) {
      setError("Supabase isn't configured for this deployment yet.");
      return;
    }

    setError(null);
    setPhase("sending");

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Admin accounts are provisioned deliberately, never self-served.
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      setError(
        /signups not allowed|not found/i.test(otpError.message)
          ? "That email doesn't have an account. Ask an owner to add you."
          : otpError.message,
      );
      setPhase("email");
      return;
    }
    setPhase("code");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setError(null);
    setPhase("verifying");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message);
      setPhase("code");
      return;
    }
    // Re-run the server-side gate.
    router.refresh();
  }

  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-[420px] place-items-center px-5 py-16">
      <div className="w-full rounded-[16px] border border-line bg-surface p-[clamp(26px,4vw,36px)]">
        {phase === "sending" || phase === "verifying" ? (
          <Spinner
            label={phase === "sending" ? "Sending your code…" : "Signing in…"}
          />
        ) : phase === "code" ? (
          <form onSubmit={verify} noValidate>
            <Heading as="h1" size="card" className="mb-1.5 !text-[24px]">
              Enter your code
            </Heading>
            <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
              Sent to <b className="text-text">{email}</b>.
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
                  setPhase("email");
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
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
              Crunch admin
            </div>
            <Heading as="h1" size="card" className="mb-1.5 !text-[26px]">
              Sign in
            </Heading>
            <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
              Site settings and website enquiries. Gym operations — members,
              classes, billing — stay in MyGymDesk.
            </p>

            {notice ? (
              <div className="mb-4 rounded-field border border-accent bg-accent-soft p-3.5 text-[13px] leading-[1.6]">
                {notice}
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
                error={error}
              />
              <Button type="submit" block>
                Email me a code
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
