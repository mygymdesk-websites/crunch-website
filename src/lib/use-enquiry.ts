"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import type { EnquirySource } from "@/lib/supabase/types";

export type EnquiryPhase = "idle" | "sending" | "done" | "error";

export interface EnquiryInput {
  name: string;
  phone: string;
  email?: string;
  interest?: string;
  message?: string;
  locationSlug: string;
  whatsappOptIn?: boolean;
  /** Honeypot value. Non-empty means a bot filled it in. */
  company?: string;
}

/**
 * One submit path for every lead form on the site — trial modal, contact form,
 * homepage appointment, PT enquiry.
 *
 * Phase 1 writes the `enquiries` mirror. Phase 2 adds the MyGymDesk forward
 * inside the same route handler, so nothing here changes.
 */
export function useEnquiry(source: EnquirySource) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<EnquiryPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: EnquiryInput): Promise<boolean> => {
      setPhase("sending");
      setError(null);

      try {
        const response = await fetch("/api/enquiries", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: input.name,
            phone: input.phone,
            email: input.email,
            interest: input.interest,
            message: input.message,
            location_slug: input.locationSlug,
            whatsapp_opt_in: input.whatsappOptIn ?? true,
            company: input.company,
            source,
            source_page: pathname,
          }),
        });

        const body = (await response.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
        } | null;

        if (!response.ok || !body?.ok) {
          setError(
            body?.message ??
              "We couldn't submit that just now. Please try again, or call the gym.",
          );
          setPhase("error");
          return false;
        }

        setPhase("done");
        return true;
      } catch {
        setError(
          "We couldn't reach our server. Check your connection and try again.",
        );
        setPhase("error");
        return false;
      }
    },
    [pathname, source],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
  }, []);

  return { phase, error, submit, reset };
}

/**
 * Client-side validation mirroring the server route.
 *
 * The server is still the authority — this exists so a typo is caught before a
 * round trip, not as a security boundary.
 */
export function validateEnquiry(input: {
  name: string;
  phone: string;
  email?: string;
}): string | null {
  if (input.name.trim().length < 2) return "Enter your full name.";

  const digits = input.phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) {
    return "Enter a valid 10-digit Indian mobile number.";
  }

  if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) {
    return "Enter a valid email address.";
  }

  return null;
}
