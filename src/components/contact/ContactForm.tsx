"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { Button } from "@/components/ui/Button";
import { Honeypot, Input, Select, Textarea } from "@/components/ui/Field";
import { Spinner, SuccessMark } from "@/components/ui/Modal";
import { CONTACT_SUBJECTS } from "@/lib/fixtures/site-content";
import { formatPhone } from "@/lib/format";
import { mailtoLink, telLink, whatsappLink } from "@/lib/location-format";
import { useEnquiry, validateEnquiry } from "@/lib/use-enquiry";

/** "Send us a message" — the main contact form, with its sending/done states. */
export function ContactForm() {
  const { locations, location } = useLocation();
  const { phase, error, submit, reset } = useEnquiry("contact_form");
  const fieldId = useId();

  const [values, setValues] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    locationSlug: location.slug,
    message: "",
    waOk: true,
    company: "",
  });
  const [clientError, setClientError] = useState<string | null>(null);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

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
      interest: values.subject || undefined,
      message: values.message || undefined,
      locationSlug: values.locationSlug,
      whatsappOptIn: values.waOk,
      company: values.company,
    });
  }

  if (phase === "sending") {
    return (
      <div className="rounded-[16px] border border-line bg-surface p-[clamp(24px,3.5vw,36px)]">
        <Spinner label="Sending…" />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-[16px] border border-line bg-surface p-[clamp(24px,3.5vw,36px)]">
        <div className="py-10 text-center">
          <SuccessMark />
          <h2 className="m-0 mb-2.5 font-display text-[26px] font-semibold uppercase">
            Message sent
          </h2>
          <p className="mx-auto m-0 mb-6 max-w-[40ch] text-[14px] text-muted">
            We reply within one working day — usually the same afternoon.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              setValues((v) => ({ ...v, message: "", subject: "" }));
            }}
          >
            Send another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-line bg-surface p-[clamp(24px,3.5vw,36px)]">
      <form onSubmit={onSubmit} noValidate>
        <h2 className="m-0 mb-1.5 font-display text-[clamp(22px,3vw,30px)] font-semibold uppercase">
          Send us a message
        </h2>
        <div
          aria-hidden="true"
          className="mb-6 h-[3px] w-14 rounded-sm bg-accent"
        />

        <div className="grid gap-[13px]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[13px]">
            <Input
              id={`${fieldId}-name`}
              label="Full name"
              placeholder="Full name"
              autoComplete="name"
              required
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <Input
              id={`${fieldId}-phone`}
              label="Mobile number"
              placeholder="+91 XXXXX XXXXX"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          <Input
            id={`${fieldId}-email`}
            label="Email address"
            placeholder="Email address"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[13px]">
            <Select
              id={`${fieldId}-subject`}
              label="What is this about?"
              value={values.subject}
              onChange={(e) => set("subject", e.target.value)}
            >
              <option value="">What is this about?</option>
              {CONTACT_SUBJECTS.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </Select>
            <Select
              id={`${fieldId}-location`}
              label="Which gym?"
              value={values.locationSlug}
              onChange={(e) => set("locationSlug", e.target.value)}
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
            label="Your message"
            placeholder="Your message"
            rows={5}
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.55] text-muted">
            <input
              type="checkbox"
              checked={values.waOk}
              onChange={(e) => set("waOk", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>Reply on WhatsApp — usually faster than email.</span>
          </label>

          <Honeypot />
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
            className="absolute -left-[9999px] h-px w-px opacity-0"
          />

          {clientError ?? error ? (
            <p className="m-0 text-[12px] text-accent" role="alert">
              {clientError ?? error}
            </p>
          ) : null}

          <Button type="submit" block size="md">
            Send message
          </Button>

          <p className="m-0 text-center text-[11px] text-muted">
            We reply within one working day. See our{" "}
            <Link href="/policies/privacy" className="border-b border-line">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </form>
    </div>
  );
}

/** The quick-contact / trial / hours rail beside the form. */
export function ContactSidebar() {
  const { location } = useLocation();
  const { openTrial } = useTrialModal();
  const wa = whatsappLink(location);

  return (
    <div className="grid gap-4">
      <div className="rounded-[16px] border border-line bg-surface p-6">
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
          Quick contact
        </div>
        <div className="grid gap-2.5">
          {wa ? (
            <ContactRow
              href={wa}
              mark="WA"
              title="WhatsApp us"
              detail={formatPhone(location.whatsapp ?? location.phone)}
              external
            />
          ) : null}
          <ContactRow
            href={telLink(location)}
            mark="☎"
            title="Call the desk"
            detail={location.hours_summary}
          />
          <ContactRow
            href={mailtoLink(location)}
            mark="✉"
            title="Email"
            detail={location.email}
          />
        </div>
      </div>

      <div className="rounded-[16px] border border-accent bg-accent-soft p-6">
        <div className="mb-2 font-display text-[19px] font-semibold uppercase">
          Rather just try it?
        </div>
        <p className="m-0 mb-4 text-[13px] leading-[1.6] text-muted">
          One free session per person, at either location. No card needed.
        </p>
        <Button block size="sm" onClick={() => openTrial()}>
          Book Free Trial
        </Button>
      </div>

      <div className="rounded-[16px] border border-line bg-surface p-6">
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
          Opening hours
        </div>
        <div className="grid gap-[9px]">
          {location.hours.map((row) => (
            <div
              key={row.label}
              className="flex justify-between gap-3 border-b border-line pb-[9px] text-[13px] last:border-b-0 last:pb-0"
            >
              <span className="text-muted">{row.label}</span>
              <b>{row.value}</b>
            </div>
          ))}
        </div>
        {location.closed_note ? (
          <p className="m-0 mt-3.5 text-[12px] text-muted">
            {location.closed_note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ContactRow({
  href,
  mark,
  title,
  detail,
  external = false,
}: {
  href: string;
  mark: string;
  title: string;
  detail: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className="flex items-center gap-3 rounded-field border border-line p-3.5 transition-colors duration-200 hover:border-accent"
    >
      <span
        aria-hidden="true"
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent"
      >
        {mark}
      </span>
      <span className="min-w-0 flex-auto">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="mt-px block text-[12px] text-muted">{detail}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-muted">
        →
      </span>
    </a>
  );
}
