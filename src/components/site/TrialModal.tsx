"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { useLocation } from "@/components/providers/LocationProvider";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { Button } from "@/components/ui/Button";
import { Honeypot, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal, Spinner, SuccessMark } from "@/components/ui/Modal";
import { TRIAL_INTERESTS } from "@/lib/fixtures/site-content";
import { useEnquiry, validateEnquiry } from "@/lib/use-enquiry";

/**
 * The global Book Free Trial modal.
 *
 * Phase 1 writes the enquiry mirror; the MyGymDesk lead forward lands in
 * Phase 2 inside /api/enquiries, so this component does not change then.
 *
 * The location dropdown is built from `site_settings`, so a third gym appears
 * here automatically.
 */
export function TrialModal() {
  const { isOpen, presetInterest, closeTrial } = useTrialModal();
  const { location } = useLocation();
  const headingId = useId();

  return (
    <Modal open={isOpen} onClose={closeTrial} labelledBy={headingId}>
      {/*
        Remounted per opening. The `key` re-seeds the form from the visitor's
        current gym and whichever class they clicked through from, without an
        effect that writes state on open — a fresh mount is the React-native
        way to reset a form.
      */}
      <TrialForm
        key={`${location.slug}:${presetInterest ?? ""}`}
        headingId={headingId}
        presetInterest={presetInterest}
        onClose={closeTrial}
      />
    </Modal>
  );
}

function TrialForm({
  headingId,
  presetInterest,
  onClose,
}: {
  headingId: string;
  presetInterest: string | null;
  onClose: () => void;
}) {
  const { locations, location } = useLocation();
  const { phase, error, submit } = useEnquiry("trial_modal");
  const fieldId = useId();

  const [values, setValues] = useState({
    name: "",
    phone: "",
    email: "",
    interest: presetInterest ?? TRIAL_INTERESTS[0],
    locationSlug: location.slug,
    message: "",
    company: "",
  });
  const [clientError, setClientError] = useState<string | null>(null);

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const chosenLocation =
    locations.find((l) => l.slug === values.locationSlug) ?? location;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = validateEnquiry(values);
    if (invalid) {
      setClientError(invalid);
      return;
    }
    setClientError(null);
    await submit({
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      interest: values.interest,
      message: values.message || undefined,
      locationSlug: values.locationSlug,
      company: values.company,
    });
  }

  if (phase === "done") {
    return (
      <div className="py-[26px] text-center">
        <SuccessMark />
        <h2
          id={headingId}
          className="m-0 mb-2.5 font-display text-[26px] font-semibold uppercase"
        >
          You&rsquo;re on the list
        </h2>
        <p className="m-0 mb-6 text-[15px] text-muted">
          We&rsquo;ll WhatsApp you shortly to confirm your slot at{" "}
          {chosenLocation.name}.
        </p>
        <Button onClick={onClose} size="sm">
          Done
        </Button>
      </div>
    );
  }

  if (phase === "sending") {
    return (
      <>
        <h2 id={headingId} className="sr-only">
          Booking your free trial
        </h2>
        <Spinner label="Sending…" />
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
            Free trial
          </div>
          <h2
            id={headingId}
            className="m-0 mb-1.5 font-display text-[28px] font-semibold uppercase"
          >
            Book your session
          </h2>
          <p className="m-0 mb-[22px] text-[14px] text-muted">
            One session, no charge. We&rsquo;ll confirm on WhatsApp.
          </p>

          <div className="grid gap-3">
            <Input
              id={`${fieldId}-name`}
              label="Full name"
              placeholder="Full name"
              autoComplete="name"
              required
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
              <Input
                id={`${fieldId}-phone`}
                label="Mobile number"
                placeholder="+91 XXXXX XXXXX"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={values.phone}
                onChange={(e) => set("phone")(e.target.value)}
              />
              <Input
                id={`${fieldId}-email`}
                label="Email address"
                placeholder="Email address"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => set("email")(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
              <Select
                id={`${fieldId}-interest`}
                label="What are you interested in?"
                value={values.interest}
                onChange={(e) => set("interest")(e.target.value)}
              >
                {TRIAL_INTERESTS.map((interest) => (
                  <option key={interest} value={interest}>
                    {interest}
                  </option>
                ))}
              </Select>
              <Select
                id={`${fieldId}-location`}
                label="Which gym?"
                value={values.locationSlug}
                onChange={(e) => set("locationSlug")(e.target.value)}
              >
                {locations.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <Textarea
              id={`${fieldId}-message`}
              label="Anything we should know?"
              placeholder="Anything we should know? (optional)"
              rows={3}
              value={values.message}
              onChange={(e) => set("message")(e.target.value)}
            />

            <Honeypot />
            {/* Controlled twin of the honeypot, so the value reaches submit(). */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={values.company}
              onChange={(e) => set("company")(e.target.value)}
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />

            {clientError ?? error ? (
              <p className="m-0 text-[12px] text-accent" role="alert">
                {clientError ?? error}
              </p>
            ) : null}

            <Button type="submit" block>
              Book Free Trial
            </Button>

            <p className="m-0 text-center text-[11px] text-muted">
              By submitting you agree to be contacted on WhatsApp. See our{" "}
              <Link
                href="/policies/privacy"
                className="border-b border-line"
                onClick={onClose}
              >
                Privacy Policy
              </Link>
              .
            </p>
      </div>
    </form>
  );
}
