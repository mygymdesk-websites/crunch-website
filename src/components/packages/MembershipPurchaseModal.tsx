"use client";

import { useId, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal, Spinner } from "@/components/ui/Modal";
import {
  formatDate,
  formatINR,
  formatPhone,
  isValidEmail,
  isValidIndianMobile,
} from "@/lib/format";
import { telLink } from "@/lib/location-format";
import type { MgdPlan } from "@/lib/mgd/types";
import { openRazorpayCheckout } from "@/lib/razorpay";

/**
 * Buy a membership: details → confirm → pay → active.
 *
 * Mirrors `BookingModal` deliberately. Same phases, same designed 503 step,
 * same idempotent-retry posture — one shape to learn, and the payment leg
 * resumes in both places the day the gateway is connected.
 *
 * RENEWAL IS NORMAL. If the phone already belongs to a member, the API creates
 * a NEW subscription rather than refusing — so nothing here special-cases it.
 * What matters is that the confirmed screen leads with the start and end dates
 * from the response, because for a renewer that is the entire answer to "what
 * did I just buy".
 */

type Phase =
  | "details"
  | "ordering"
  | "confirm"
  | "paying"
  | "gateway_offline"
  | "unavailable"
  | "done";

interface Confirmed {
  planName: string;
  startDate: string;
  endDate: string;
  amountCharged: number;
  invoiceNumber: string | null;
  memberAppProvisioned: boolean;
  locationName: string | null;
  alreadyConfirmed: boolean;
}

export function MembershipPurchaseModal({
  plan,
  onClose,
}: {
  plan: MgdPlan | null;
  onClose: () => void;
}) {
  const headingId = useId();
  return (
    <Modal open={plan !== null} onClose={onClose} labelledBy={headingId} maxWidth={520}>
      {/* Keyed so switching plans re-seeds the form rather than carrying state. */}
      {plan ? (
        <PurchaseFlow
          key={plan.id}
          plan={plan}
          headingId={headingId}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function PurchaseFlow({
  plan,
  headingId,
  onClose,
}: {
  plan: MgdPlan;
  headingId: string;
  onClose: () => void;
}) {
  const { location } = useLocation();
  const fieldId = useId();

  const [phase, setPhase] = useState<Phase>("details");
  const [values, setValues] = useState({ name: "", phone: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [testMode, setTestMode] = useState(false);

  const set = (key: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrorField(null);
  };

  function validate(): boolean {
    if (values.name.trim().length < 2) {
      setErrorField("name");
      setError("Enter your full name.");
      return false;
    }
    if (!isValidIndianMobile(values.phone)) {
      setErrorField("phone");
      setError("Enter a valid 10-digit mobile number.");
      return false;
    }
    if (!isValidEmail(values.email)) {
      setErrorField("email");
      setError("Enter a valid email address.");
      return false;
    }
    return true;
  }

  function toConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (validate()) setPhase("confirm");
  }

  async function pay() {
    setError(null);
    setPhase("ordering");

    try {
      const res = await fetch("/api/membership/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          ...values,
          locationId: location.mgd_location_id ?? undefined,
        }),
      });
      const order = await res.json();

      if (!res.ok || !order.ok) {
        // Expected today: no gateway connected.
        if (
          order?.error === "gateway_not_configured" ||
          order?.error === "gateway_reconnect_required" ||
          order?.error === "plan_upgrade_required"
        ) {
          setPhase("gateway_offline");
          return;
        }
        // The plan went away or lost its price between render and buy.
        if (
          order?.error === "plan_not_found" ||
          order?.error === "plan_not_priced" ||
          order?.error === "order_not_priced"
        ) {
          setError(order.message);
          setPhase("unavailable");
          return;
        }
        setError(order?.message ?? "We couldn't start the payment.");
        setPhase("confirm");
        return;
      }

      setTestMode(Boolean(order.testMode));
      setPhase("paying");

      const capture = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.razorpayOrderId,
        amount: order.amount, // already paise
        currency: order.currency,
        name: location.name,
        description: `${order.planName} membership`,
        customer: values,
      });

      // Retried on a transport failure: the upstream is idempotent per capture,
      // so a second call returns the original result rather than charging again.
      const confirm = async () =>
        fetch("/api/membership/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            purchaseId: order.purchaseId,
            payment: {
              orderId: capture.razorpay_order_id,
              captureId: capture.razorpay_payment_id,
              signature: capture.razorpay_signature,
            },
          }),
        });

      let confirmRes: Response;
      try {
        confirmRes = await confirm();
      } catch {
        confirmRes = await confirm();
      }

      const result = await confirmRes.json();
      if (!confirmRes.ok || !result.ok) {
        setError(
          result?.message ??
            "Your payment went through but we couldn't confirm the membership. " +
              "Please call the gym — do not pay again.",
        );
        setPhase("confirm");
        return;
      }

      setConfirmed(result as Confirmed);
      setPhase("done");
    } catch (err) {
      // Includes the customer dismissing Checkout, which is not a failure.
      setError(err instanceof Error ? err.message : "The payment did not complete.");
      setPhase("confirm");
    }
  }

  // -------------------------------------------------------------------- done
  if (phase === "done" && confirmed) {
    return (
      <div>
        {testMode ? <TestModeRibbon /> : null}
        <div className="mb-1 font-display text-[26px] font-semibold uppercase" id={headingId}>
          {confirmed.alreadyConfirmed ? "Already confirmed" : "You're a member"}
        </div>
        <p className="m-0 mb-5 text-[14px] leading-[1.6] text-muted">
          {confirmed.planName} at{" "}
          {confirmed.locationName ?? location.short_name}.
        </p>

        {/* Leading with the term: for a renewal this is the whole point. */}
        <div className="rounded-field border border-accent bg-accent-soft p-4">
          <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">
            Your membership runs
          </div>
          <div className="mt-1 font-display text-[20px] font-semibold">
            {formatDate(confirmed.startDate)} — {formatDate(confirmed.endDate)}
          </div>
        </div>

        <dl className="m-0 mt-4 rounded-field border border-line">
          <Row label="Paid" value={formatINR(confirmed.amountCharged)} />
          {confirmed.invoiceNumber ? (
            <Row label="Invoice" value={confirmed.invoiceNumber} />
          ) : null}
        </dl>

        <p className="mt-4 text-[13px] leading-[1.6] text-muted">
          Your GST invoice
          {confirmed.memberAppProvisioned ? " and Member App access" : ""} are on
          their way to <b className="text-text">{formatPhone(values.phone)}</b> on
          WhatsApp.
        </p>

        <Button className="mt-5" block onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  // ------------------------------------------------- gateway not switched on
  if (phase === "gateway_offline") {
    return (
      <div>
        <div className="mb-3 font-display text-[24px] font-semibold uppercase" id={headingId}>
          Paying online is launching soon
        </div>
        <p className="m-0 text-[14px] leading-[1.6] text-muted">
          We can&rsquo;t take card payments on the site just yet. Call{" "}
          {location.short_name} and the desk will set up your{" "}
          <b className="text-text">{plan.name}</b> membership — UPI or card, with
          the GST invoice emailed the same minute.
        </p>

        <div className="mt-5 rounded-field border border-accent bg-accent-soft p-4">
          <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">
            Call {location.short_name}
          </div>
          <a
            href={telLink(location)}
            className="mt-1 block font-display text-[24px] font-semibold text-text"
          >
            {formatPhone(location.phone)}
          </a>
        </div>

        <p className="mt-4 text-[12px] leading-[1.6] text-muted">
          Nothing has been charged and no membership has been created.
        </p>
        <Button className="mt-5" block onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  // --------------------------------------------------- plan went away
  if (phase === "unavailable") {
    return (
      <div>
        <div className="mb-3 font-display text-[24px] font-semibold uppercase" id={headingId}>
          That plan isn&rsquo;t available
        </div>
        <p className="m-0 text-[14px] leading-[1.6] text-muted">{error}</p>
        <Button className="mt-6" block onClick={onClose}>
          Back to memberships
        </Button>
      </div>
    );
  }

  if (phase === "ordering") return <Spinner label="Setting up your payment…" />;
  if (phase === "paying") return <Spinner label="Opening payment…" />;

  // ----------------------------------------------------------------- confirm
  if (phase === "confirm") {
    return (
      <div>
        <div className="mb-1 font-display text-[24px] font-semibold uppercase" id={headingId}>
          Confirm your membership
        </div>
        <p className="m-0 mb-5 text-[13px] text-muted">
          Check the details, then pay to activate.
        </p>

        <dl className="m-0 rounded-field border border-line">
          <Row label="Plan" value={plan.name} />
          {plan.intervalLabel ? (
            <Row label="Billing" value={plan.intervalLabel} />
          ) : null}
          <Row label="Gym" value={location.name} />
          <Row label="Name" value={values.name} />
          <Row label="Mobile" value={formatPhone(values.phone)} />
          <Row label="Email" value={values.email} />
          <Row label="Total" value={formatINR(plan.price)} emphasis />
        </dl>

        <p className="mt-3 text-[12px] leading-[1.6] text-muted">
          Already a member? Buying again adds a new term — the dates you get on
          the next screen are the ones that count.
        </p>

        {error ? (
          <p className="mt-4 text-[13px] leading-[1.6] text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="mt-5" block onClick={pay}>
          Pay {formatINR(plan.price)}
        </Button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setPhase("details");
          }}
          className="mt-3 w-full cursor-pointer border-0 bg-transparent text-[12px] text-muted underline"
        >
          Change details
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------------- details
  return (
    <form onSubmit={toConfirm} noValidate>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-accent">
        Membership
      </div>
      <div className="mb-1 font-display text-[24px] font-semibold uppercase" id={headingId}>
        {plan.name}
      </div>
      <p className="m-0 mb-5 text-[13px] text-muted">
        {formatINR(plan.price)}
        {plan.intervalLabel ? ` · ${plan.intervalLabel}` : ""} at{" "}
        {location.short_name}
      </p>

      <div className="grid gap-3.5">
        <Input
          id={`${fieldId}-name`}
          label="Full name"
          value={values.name}
          onChange={(e) => set("name")(e.target.value)}
          autoComplete="name"
          error={errorField === "name" ? (error ?? undefined) : undefined}
          required
        />
        <Input
          id={`${fieldId}-phone`}
          label="Mobile"
          type="tel"
          inputMode="numeric"
          value={values.phone}
          onChange={(e) => set("phone")(e.target.value)}
          autoComplete="tel"
          hint="Your Member App access is sent here."
          error={errorField === "phone" ? (error ?? undefined) : undefined}
          required
        />
        <Input
          id={`${fieldId}-email`}
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => set("email")(e.target.value)}
          autoComplete="email"
          hint="For the GST invoice."
          error={errorField === "email" ? (error ?? undefined) : undefined}
          required
        />
      </div>

      {error && !errorField ? (
        <p className="mt-4 text-[13px] leading-[1.6] text-accent" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="mt-5" block>
        Continue
      </Button>
    </form>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
      <dt className="m-0 text-[11px] font-bold uppercase tracking-[.08em] text-muted">
        {label}
      </dt>
      <dd
        className={`m-0 text-right ${
          emphasis ? "font-display text-[20px] font-semibold" : "text-[14px]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Shown only when the API reports `test_mode` on the order. Never inferred. */
function TestModeRibbon() {
  return (
    <div className="mb-4 rounded-pill border border-accent bg-accent-soft px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-text">
      Test mode — no real money moved
    </div>
  );
}
