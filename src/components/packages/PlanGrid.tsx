"use client";

import { useId, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { MembershipPurchaseModal } from "@/components/packages/MembershipPurchaseModal";
import { Button } from "@/components/ui/Button";
import { Honeypot, Input, Textarea } from "@/components/ui/Field";
import { Modal, SuccessMark } from "@/components/ui/Modal";
import { Badge, Card, SkeletonBlock } from "@/components/ui/Primitives";
import { formatINR } from "@/lib/format";
import type { MgdPlan } from "@/lib/mgd/types";
import { useEnquiry, validateEnquiry } from "@/lib/use-enquiry";

/**
 * Pricing cards for membership and PT plans.
 *
 * Two behaviours come straight from the MGD contract:
 *
 *   - `price: 0` means "no price set", so the card reads "Contact us" and the
 *     CTA opens an enquiry instead of a checkout. It must never render "₹0".
 *   - purchase itself is Phase 4 (Track A ships `website-membership-order` /
 *     `website-membership-purchase`). The priced CTA therefore explains where
 *     to pay today rather than pretending to take money.
 */
export function PlanGrid({
  plans,
  kind,
}: {
  plans: MgdPlan[];
  kind: "membership" | "pt";
}) {
  const [enquiryPlan, setEnquiryPlan] = useState<MgdPlan | null>(null);
  const [infoPlan, setInfoPlan] = useState<MgdPlan | null>(null);

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(258px,1fr))] items-start gap-[18px]">
        {plans.map((plan) => {
          const priced = plan.price > 0;
          return (
            <Card
              key={plan.id}
              featured={plan.featured}
              className={`relative p-7 transition-transform duration-300 hover:-translate-y-[3px] ${
                kind === "pt" ? "!bg-bg" : ""
              }`}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-6">
                  <Badge tone="accent" className="tracking-[.12em]">
                    {kind === "pt" ? "Best value" : "Most Popular"}
                  </Badge>
                </span>
              ) : null}

              <div
                className={`mb-3.5 text-[12px] font-bold uppercase tracking-[.12em] ${
                  plan.featured ? "text-accent" : "text-muted"
                }`}
              >
                {plan.name}
              </div>

              <div className="mb-1.5 flex flex-wrap items-baseline gap-[7px]">
                <span
                  className={`font-display font-semibold leading-none ${
                    priced ? "text-[38px]" : "text-[26px]"
                  }`}
                >
                  {priced ? formatINR(plan.price) : "Contact us"}
                </span>
                {priced ? (
                  <span className="text-[13px] text-muted">
                    {plan.intervalLabel}
                  </span>
                ) : null}
              </div>

              <div className="mb-[22px] min-h-[18px] text-[12px] text-muted">
                {plan.description}
              </div>

              <div className="mb-[26px] grid gap-2.5 text-[14px] text-muted">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-[9px]">
                    <span aria-hidden="true" className="shrink-0 text-accent">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.featured ? "primary" : "outline"}
                block
                onClick={() =>
                  priced ? setInfoPlan(plan) : setEnquiryPlan(plan)
                }
              >
                {priced
                  ? kind === "pt"
                    ? `Buy ${plan.name}`
                    : `Choose ${plan.name}`
                  : "Contact us"}
              </Button>
            </Card>
          );
        })}
      </div>

      <PlanEnquiryModal
        plan={enquiryPlan}
        onClose={() => setEnquiryPlan(null)}
      />

      {/* Priced plans go to the real purchase flow; unpriced ones still route
          to the enquiry form, because there is nothing to charge. */}
      <MembershipPurchaseModal
        plan={infoPlan}
        onClose={() => setInfoPlan(null)}
      />
    </>
  );
}

/** "Contact us" flow for a plan with no price set. */
function PlanEnquiryModal({
  plan,
  onClose,
}: {
  plan: MgdPlan | null;
  onClose: () => void;
}) {
  const { location } = useLocation();
  const { phase, error, submit, reset } = useEnquiry("packages_enquiry");
  const headingId = useId();
  const fieldId = useId();
  const [values, setValues] = useState({
    name: "",
    phone: "",
    message: "",
    company: "",
  });
  const [clientError, setClientError] = useState<string | null>(null);

  function close() {
    onClose();
    reset();
    setValues({ name: "", phone: "", message: "", company: "" });
    setClientError(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = validateEnquiry({ name: values.name, phone: values.phone });
    if (invalid) {
      setClientError(invalid);
      return;
    }
    setClientError(null);
    await submit({
      name: values.name,
      phone: values.phone,
      interest: plan?.name,
      message: values.message || undefined,
      locationSlug: location.slug,
      company: values.company,
    });
  }

  return (
    <Modal open={plan !== null} onClose={close} labelledBy={headingId}>
      {phase === "done" ? (
        <div className="py-[26px] text-center">
          <SuccessMark />
          <h2
            id={headingId}
            className="m-0 mb-2.5 font-display text-[26px] font-semibold uppercase"
          >
            Request sent
          </h2>
          <p className="m-0 mb-6 text-[15px] text-muted">
            We&rsquo;ll WhatsApp you shortly with trainer availability at{" "}
            {location.short_name}.
          </p>
          <Button onClick={close} size="sm">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
            Enquiry
          </div>
          <h2
            id={headingId}
            className="m-0 mb-1.5 font-display text-[26px] font-semibold uppercase"
          >
            {plan?.name}
          </h2>
          <p className="m-0 mb-5 text-[14px] text-muted">
            This one is quoted per person after a short call. Leave your number
            and a coach will WhatsApp you.
          </p>

          <div className="grid gap-3">
            <Input
              id={`${fieldId}-name`}
              label="Full name"
              placeholder="Full name"
              autoComplete="name"
              required
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
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
              onChange={(e) =>
                setValues((v) => ({ ...v, phone: e.target.value }))
              }
            />
            <Textarea
              id={`${fieldId}-message`}
              label="What are you training for?"
              placeholder="What are you training for?"
              rows={3}
              value={values.message}
              onChange={(e) =>
                setValues((v) => ({ ...v, message: e.target.value }))
              }
            />

            <Honeypot />
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={values.company}
              onChange={(e) =>
                setValues((v) => ({ ...v, company: e.target.value }))
              }
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />

            {clientError ?? error ? (
              <p className="m-0 text-[12px] text-accent" role="alert">
                {clientError ?? error}
              </p>
            ) : null}

            <Button type="submit" block disabled={phase === "sending"}>
              {phase === "sending" ? "Sending…" : "Request a call"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
/** Loading state for a plan grid. */
export function PlanGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[18px]">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-[shimmer_1.4s_ease-in-out_infinite] rounded-[16px] border border-line bg-surface p-7"
        >
          <SkeletonBlock className="mb-5 h-3 w-[45%] rounded" />
          <SkeletonBlock className="mb-6 h-9 w-[70%] rounded-md" />
          <SkeletonBlock className="mb-3 h-[11px] rounded" />
          <SkeletonBlock className="mb-3 h-[11px] rounded" />
          <SkeletonBlock className="mb-7 h-[11px] w-4/5 rounded" />
          <SkeletonBlock className="h-[46px] rounded-pill" />
        </div>
      ))}
    </div>
  );
}
