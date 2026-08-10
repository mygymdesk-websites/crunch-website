"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { ClassCard } from "@/components/classes/ClassCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { Honeypot, Input, Select } from "@/components/ui/Field";
import { SuccessMark } from "@/components/ui/Modal";
import {
  Badge,
  Card,
  Container,
  Eyebrow,
  Heading,
  Section,
} from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import {
  APPOINTMENT_TIMEFRAMES,
  SOCIAL_TILES,
  TESTIMONIALS,
  TRUST_BARS,
  WHY_US,
} from "@/lib/fixtures/site-content";
import type { MgdClassType, MgdPlan } from "@/lib/mgd/types";
import type { Trainer } from "@/lib/trainers";
import { useEnquiry, validateEnquiry } from "@/lib/use-enquiry";

/**
 * "On the schedule at {location}" — class cards for the selected gym.
 *
 * Hidden entirely when there is nothing to show. The homepage is a shop
 * window: a section heading promising classes, sitting above an empty grid,
 * is worse than no section at all. The Classes page is where a visitor who
 * went looking gets the explanatory empty state.
 */
export function HomeClasses({ classes }: { classes: MgdClassType[] }) {
  const { location } = useLocation();

  if (classes.length === 0) return null;

  return (
    <Container className="reveal pt-[72px]">
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow className="mb-2.5">Group classes</Eyebrow>
          <Heading>On the schedule at {location.short_name}</Heading>
        </div>
        <Link
          href="/classes"
          className="border-b-2 border-accent pb-[3px] text-[13px] font-bold uppercase tracking-[.08em]"
        >
          See timetable →
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(255px,1fr))] gap-4">
        {classes.slice(0, 6).map((classType) => (
          <ClassCard key={classType.id} classType={classType} />
        ))}
      </div>
    </Container>
  );
}

/** Coach portraits. The first card carries the accent ring, per the design. */
export function HomeTrainers({ trainers }: { trainers: Trainer[] }) {
  // Still hidden when there is nothing to show — a section heading above an
  // empty grid is worse than no section. The difference now is that filling it
  // is a job for the admin panel rather than a code change.
  if (trainers.length === 0) return null;

  return (
    <Section band="surface" className="mt-[76px]">
      <Container className="reveal py-16">
        <div className="mb-[38px] text-center">
          <Eyebrow boxed className="mb-3.5">
            The team
          </Eyebrow>
          <Heading className="mb-2.5">Coaches on the floor</Heading>
          <p className="m-0 text-[14px] text-muted">
            Certified, full-time, and on shift — not commission staff passing
            through.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-6">
          {trainers.map((trainer, index) => (
            <div key={trainer.id} className="text-center">
              <div
                className={`mx-auto mb-4 aspect-square w-[min(200px,60vw)] overflow-hidden rounded-full border-[3px] p-[5px] ${
                  index === 0 ? "border-accent" : "border-line"
                }`}
              >
                <CoverImage
                  src={trainer.image_url}
                  alt={trainer.name}
                  placeholderLabel={trainer.name.toLowerCase()}
                  className="overflow-hidden rounded-full"
                  imgClassName="rounded-full"
                  objectPosition="74% 30%"
                />
              </div>
              <div
                className={`font-display text-[19px] font-bold uppercase ${
                  index === 0 ? "text-accent" : "text-text"
                }`}
              >
                {trainer.name}
              </div>
              {trainer.role ? (
                <div className="mt-1 text-[13px] text-muted">{trainer.role}</div>
              ) : null}
              <div className="mt-2 text-[11px] uppercase tracking-[.1em] text-muted opacity-80">
                <LocationName id={trainer.location_id} />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/** Renders a location's short name from its slug — never hardcoded. */
/** A coach with no branch floats across all of them, which is the common case. */
function LocationName({ id }: { id: string | null }) {
  const { locations } = useLocation();
  if (!id) return <>All branches</>;
  return <>{locations.find((l) => l.id === id)?.short_name ?? ""}</>;
}

/** The numbered 01–04 "why us" block. No icons, per the design system. */
export function HomeWhyUs() {
  return (
    <Container className="reveal pt-[72px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[34px]">
        {WHY_US.map((item, index) => (
          <div key={item.title}>
            <div className="mb-3 font-display text-[30px] font-bold leading-none text-accent">
              {String(index + 1).padStart(2, "0")}
            </div>
            <h3 className="m-0 mb-2 text-[17px] font-bold">{item.title}</h3>
            <p className="m-0 text-[14px] leading-[1.6] text-muted">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </Container>
  );
}

/**
 * Pricing cards. `price: 0` renders "Contact us", per the MGD contract.
 *
 * Hidden when the gym has published nothing — same reasoning as HomeClasses.
 * The Packages page carries the explanatory empty state.
 */
export function HomePackages({
  plans,
  ptPlans = [],
}: {
  plans: MgdPlan[];
  /** Service packages, used for the "PT from ₹X" line. */
  ptPlans?: MgdPlan[];
}) {
  // The homepage shows the three recurring plans; the day pass lives on the
  // Packages page where the full list is.
  const shown = plans.filter((p) => p.interval !== "day_pass").slice(0, 3);
  const dayPass = plans.find((p) => p.interval === "day_pass");

  // Cheapest priced PT block, so the "from" figure is the gym's real one.
  // `price: 0` means "no price set", so those rows are excluded rather than
  // making this read "from ₹0".
  const ptPrices = ptPlans.map((p) => p.price).filter((price) => price > 0);
  const ptFrom = ptPrices.length > 0 ? Math.min(...ptPrices) : null;

  if (shown.length === 0) return null;

  return (
    <Container id="packages" className="reveal pt-[72px]">
      <div className="mb-[34px] text-center">
        <Eyebrow className="mb-2.5">Memberships</Eyebrow>
        <Heading className="mb-3">Pay once. Train daily.</Heading>
        <p className="m-0 text-[14px] text-muted">
          All plans include locker access, and a GST invoice emailed after
          purchase.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-[18px]">
        {shown.map((plan) => (
          <Card key={plan.id} featured={plan.featured} className="relative p-7">
            {plan.featured ? (
              <span className="absolute -top-3 left-7">
                <Badge tone="accent" className="tracking-[.12em]">
                  Most Popular
                </Badge>
              </span>
            ) : null}
            <div
              className={`mb-4 text-[12px] font-bold uppercase tracking-[.12em] ${
                plan.featured ? "text-accent" : "text-muted"
              }`}
            >
              {plan.name}
            </div>
            <div className="mb-1.5 flex flex-wrap items-baseline gap-[7px]">
              <span className="font-display text-[40px] font-bold leading-none">
                {plan.price > 0 ? formatINR(plan.price) : "Contact us"}
              </span>
              {plan.price > 0 ? (
                <span className="text-[13px] text-muted">
                  {plan.intervalLabel}
                </span>
              ) : null}
            </div>
            <div className="mb-5 min-h-[18px] text-[12px] text-muted">
              {plan.description}
            </div>
            <div className="mb-[26px] grid gap-2.5 text-[14px] text-muted">
              {plan.features.map((feature) => (
                <div key={feature}>{feature}</div>
              ))}
            </div>
            <ButtonLink
              href="/packages"
              variant={plan.featured ? "primary" : "outline"}
              block
              size="md"
            >
              {plan.price > 0 ? `Choose ${plan.name}` : "Contact us"}
            </ButtonLink>
          </Card>
        ))}
      </div>

      {/* Every figure here comes from the API — nothing is asserted about the
          gym's prices that the gym did not publish. */}
      <p className="m-0 mt-[22px] text-center text-[13px] text-muted">
        {dayPass && dayPass.price > 0
          ? `Day pass ${formatINR(dayPass.price)} · `
          : null}
        {ptFrom !== null
          ? `Personal training from ${formatINR(ptFrom)} a session · `
          : null}
        <Link href="/packages" className="border-b border-line">
          Compare all plans
        </Link>
      </p>
    </Container>
  );
}

export function HomeTestimonials() {
  // Hidden until real, permissioned member quotes exist. Fabricated
  // endorsements attributed to named people are the highest-risk claim on a
  // live business site.
  if (TESTIMONIALS.length === 0) return null;

  return (
    <Container className="reveal pt-[72px]">
      <Heading className="mb-[30px]">Members, in their words</Heading>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
        {TESTIMONIALS.map((testimonial) => (
          <figure
            key={testimonial.name}
            className="m-0 rounded-card border border-line bg-surface p-[26px]"
          >
            <div
              aria-hidden="true"
              className="font-display text-[34px] font-bold leading-[.6] text-accent"
            >
              &ldquo;
            </div>
            <blockquote className="my-3.5 mb-5 text-[16px] leading-[1.6]">
              {testimonial.quote}
            </blockquote>
            <figcaption className="flex items-center gap-[11px]">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <CoverImage
                  src={testimonial.image}
                  alt={testimonial.name}
                  placeholderLabel={testimonial.name.toLowerCase()}
                />
              </span>
              <span>
                <span className="block text-[13px] font-bold">
                  {testimonial.name}
                </span>
                <span className="block text-[12px] text-muted">
                  {testimonial.meta}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Container>
  );
}

export function HomeSocial() {
  // Was stock photography presented as the gym's own Instagram feed.
  if (SOCIAL_TILES.length === 0) return null;

  return (
    <Container className="reveal pt-[72px]">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-5">
        <Heading className="!text-[clamp(20px,2.8vw,30px)]">
          @crunchfitness.in
        </Heading>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        {SOCIAL_TILES.map((tile, index) => (
          <div
            key={tile}
            className="aspect-square overflow-hidden rounded-lg transition-opacity hover:opacity-80"
          >
            <CoverImage
              src={tile}
              alt=""
              placeholderLabel={`gym photo ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </Container>
  );
}

/** The full-bleed accent CTA band. */
export function HomeTrialBand() {
  const { openTrial } = useTrialModal();

  return (
    <Section band="accent" className="mt-[76px]">
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-7 px-5 py-[66px]">
        <div>
          <h2 className="m-0 mb-2.5 max-w-[16ch] font-display text-[clamp(28px,4.6vw,54px)] font-bold uppercase leading-[1.02]">
            Your first session is on us.
          </h2>
          <p className="m-0 text-[15px] opacity-90">
            One free trial per person, at either location. No card needed.
          </p>
        </div>
        <Button variant="dark" size="lg" onClick={() => openTrial()}>
          Book Free Trial
        </Button>
      </div>
    </Section>
  );
}

/** "Our numbers" progress bars alongside the appointment form. */
export function HomeNumbersAndAppointment() {
  const { locations, location } = useLocation();
  const { phase, error, submit } = useEnquiry("appointment_form");
  const fieldId = useId();
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    interest: "",
    timeframe: "",
    locationSlug: location.slug,
    company: "",
  });
  const [clientError, setClientError] = useState<string | null>(null);

  const set = (key: keyof typeof values) => (value: string) =>
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
      interest: values.interest || undefined,
      message: values.timeframe
        ? `Looking to join: ${values.timeframe}`
        : undefined,
      locationSlug: values.locationSlug,
      company: values.company,
    });
  }

  const chosen =
    locations.find((l) => l.slug === values.locationSlug) ?? location;

  return (
    <Section band="surface" className="!border-b-0">
      <div className="reveal mx-auto grid w-full max-w-content grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-14 px-5 py-20">
        <div>
          <Eyebrow boxed className="mb-[18px]">
            Our numbers
          </Eyebrow>
          <Heading className="mb-3.5 max-w-[16ch]">
            Members stay. That says everything.
          </Heading>
          <p className="m-0 mb-[34px] max-w-[46ch] text-[14px] leading-[1.65] text-muted">
            The numbers we watch every month across both gyms — not vanity
            stats, just whether people keep showing up and feel looked after.
          </p>

          <div className="grid gap-[26px]">
            {/* Percentages nobody measured are gone; the block hides when
                there is nothing real to show. */}
            {TRUST_BARS.map((bar, index) => (
              <div key={bar.label}>
                <div className="mb-[9px] flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-bold">{bar.label}</span>
                  <span className="font-display text-[20px] font-bold text-accent">
                    {bar.percent}%
                  </span>
                </div>
                <div
                  className="h-[7px] overflow-hidden rounded-pill bg-surface2"
                  role="img"
                  aria-label={`${bar.label}: ${bar.percent} percent`}
                >
                  <div
                    className="h-full rounded-pill bg-accent"
                    style={{
                      width: `${bar.percent}%`,
                      animation: `fillBar 1.4s ${index * 0.15}s both`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-line bg-surface2 p-[clamp(24px,4vw,40px)]">
          {phase === "done" ? (
            <div className="py-10 text-center">
              <SuccessMark />
              <h3 className="m-0 mb-2.5 font-display text-[26px] font-semibold uppercase">
                Request received
              </h3>
              <p className="m-0 text-[14px] text-muted">
                We&rsquo;ll WhatsApp you shortly to fix a time at {chosen.name}.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <h3 className="m-0 mb-1.5 font-display text-[clamp(24px,3vw,32px)] font-semibold uppercase">
                Get an appointment
              </h3>
              <div
                aria-hidden="true"
                className="mb-[26px] h-[3px] w-14 rounded-sm bg-accent"
              />
              <div className="grid gap-3.5">
                <Input
                  id={`${fieldId}-name`}
                  label="Full name"
                  placeholder="Full name"
                  autoComplete="name"
                  required
                  value={values.name}
                  onChange={(e) => set("name")(e.target.value)}
                  className="!bg-surface"
                />
                <Input
                  id={`${fieldId}-email`}
                  label="Email address"
                  placeholder="Email address"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) => set("email")(e.target.value)}
                  className="!bg-surface"
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
                  onChange={(e) => set("phone")(e.target.value)}
                  className="!bg-surface"
                />
                <Select
                  id={`${fieldId}-interest`}
                  label="Which membership are you looking for?"
                  value={values.interest}
                  onChange={(e) => set("interest")(e.target.value)}
                  className="!bg-surface"
                >
                  <option value="">
                    Which membership are you looking for?
                  </option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Annual</option>
                  <option>Personal Training</option>
                  <option>Day Pass</option>
                </Select>
                <Select
                  id={`${fieldId}-timeframe`}
                  label="When are you looking to join?"
                  value={values.timeframe}
                  onChange={(e) => set("timeframe")(e.target.value)}
                  className="!bg-surface"
                >
                  <option value="">When are you looking to join?</option>
                  {APPOINTMENT_TIMEFRAMES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
                <Select
                  id={`${fieldId}-location`}
                  label="Select location"
                  value={values.locationSlug}
                  onChange={(e) => set("locationSlug")(e.target.value)}
                  className="!bg-surface"
                >
                  {locations.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </Select>

                <Honeypot />
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

                <button
                  type="submit"
                  disabled={phase === "sending"}
                  className="cursor-pointer rounded-field border-0 bg-accent px-5 py-4 text-[13px] font-bold uppercase tracking-[.1em] text-accent-ink transition-[filter] hover:brightness-[1.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {phase === "sending" ? "Sending…" : "Submit Now"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}
