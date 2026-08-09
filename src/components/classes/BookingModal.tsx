"use client";

import { useId, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal, Spinner } from "@/components/ui/Modal";
import {
  DAY_LABELS_FULL,
  formatDuration,
  formatINR,
  formatPhone,
  formatTime,
  isValidEmail,
  isValidIndianMobile,
} from "@/lib/format";
import { telLink } from "@/lib/location-format";
import type { MgdClassSession } from "@/lib/mgd/types";
import { openRazorpayCheckout } from "@/lib/razorpay";

/**
 * Book a class: details → price confirmation → pay → confirmed.
 *
 * Two things shape this component.
 *
 * ONE: the session id in the timetable is not safe to book. `website-classes`
 * returns a weekly template whose `id` is the next real occurrence, and it
 * rolls forward. So the modal never books the id it was handed — it posts the
 * stable `templateKey` to `/api/booking/quote`, which re-resolves the current
 * id from a fresh read and returns the authoritative price with it.
 *
 * TWO: online payment is not switched on yet. `/api/booking/order` returns
 * `503 gateway_not_configured`, which is a designed state here, not an error —
 * "booking online is launching soon, call the gym". When the client's Razorpay
 * credentials land, that same route starts returning orders and the flow
 * continues into Checkout with no change to this file's structure.
 */

type Phase =
  | "details"
  | "quoting"
  | "confirm"
  | "paying"
  | "gateway_offline"
  | "confirmed"
  | "unavailable";

interface Quote {
  sessionId: string;
  name: string;
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  instructorName: string | null;
  spotsLeft: number;
  amount: number;
  currency: string;
  locationName: string | null;
}

interface Confirmed {
  bookingId: string;
  amountCharged: number;
  locationName: string | null;
}

export function BookingModal({
  session,
  open,
  onClose,
}: {
  session: MgdClassSession | null;
  open: boolean;
  onClose: () => void;
}) {
  const headingId = useId();

  return (
    <Modal open={open} onClose={onClose} labelledBy={headingId} maxWidth={520}>
      {/*
        Keyed on the session so picking a different slot re-seeds the form and
        drops any previous quote, without an effect that writes state on open.
      */}
      {session ? (
        <BookingFlow
          key={session.templateKey}
          headingId={headingId}
          session={session}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function BookingFlow({
  headingId,
  session,
  onClose,
}: {
  headingId: string;
  session: MgdClassSession;
  onClose: () => void;
}) {
  const { location } = useLocation();
  const fieldId = useId();

  const [phase, setPhase] = useState<Phase>("details");
  const [values, setValues] = useState({ name: "", phone: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [testMode, setTestMode] = useState(false);

  const set = (key: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrorField(null);
  };

  const when = `${DAY_LABELS_FULL[session.dayOfWeek]} ${formatTime(session.startTime)}`;

  /** Details → quote. Validates locally first so a bad phone costs no request. */
  async function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (values.name.trim().length < 2) {
      setErrorField("name");
      setError("Enter your full name.");
      return;
    }
    if (!isValidIndianMobile(values.phone)) {
      setErrorField("phone");
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isValidEmail(values.email)) {
      setErrorField("email");
      setError("Enter a valid email address.");
      return;
    }

    setPhase("quoting");
    try {
      const res = await fetch("/api/booking/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateKey: session.templateKey,
          locationId: session.locationId,
        }),
      });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        setError(body?.message ?? "We couldn't check that slot. Please try again.");
        // A slot that filled or rolled off is not something a retry fixes.
        setPhase(
          body?.error === "slot_full" ||
            body?.error === "session_not_found" ||
            body?.error === "session_not_priced"
            ? "unavailable"
            : "details",
        );
        return;
      }

      setQuote(body as Quote);
      setPhase("confirm");
    } catch {
      setError("We couldn't reach the booking system. Please try again.");
      setPhase("details");
    }
  }

  /** Confirm → order → Checkout → booking. */
  async function pay() {
    if (!quote) return;
    setError(null);
    setPhase("paying");

    try {
      const res = await fetch("/api/booking/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: quote.sessionId, ...values }),
      });
      const order = await res.json();

      if (!res.ok || !order.ok) {
        // The expected state today: the gym has not connected a gateway.
        if (
          order?.error === "gateway_not_configured" ||
          order?.error === "gateway_reconnect_required"
        ) {
          setPhase("gateway_offline");
          return;
        }
        setError(order?.message ?? "We couldn't start the payment.");
        setPhase("confirm");
        return;
      }

      // TEST MODE comes from the API's own flag, never inferred from a key.
      setTestMode(Boolean(order.testMode));

      const capture = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: location.name,
        description: `${session.name} · ${when}`,
        customer: values,
      });

      const confirmRes = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: quote.sessionId,
          ...values,
          payment: {
            orderId: capture.razorpay_order_id,
            captureId: capture.razorpay_payment_id,
            signature: capture.razorpay_signature,
          },
        }),
      });
      const booking = await confirmRes.json();

      if (!confirmRes.ok || !booking.ok) {
        setError(
          booking?.message ??
            "Your payment went through but we couldn't confirm the booking. " +
              "Please call the gym — do not pay again.",
        );
        setPhase("confirm");
        return;
      }

      setConfirmed(booking as Confirmed);
      setPhase("confirmed");
    } catch (err) {
      // Includes the customer closing Checkout, which is not a failure.
      setError(
        err instanceof Error ? err.message : "The payment did not complete.",
      );
      setPhase("confirm");
    }
  }

  // ---------------------------------------------------------------- confirmed
  if (phase === "confirmed" && confirmed) {
    return (
      <div className="text-center">
        {testMode ? <TestModeRibbon /> : null}
        <div className="mb-3 font-display text-[26px] font-semibold uppercase" id={headingId}>
          You&rsquo;re booked
        </div>
        <p className="m-0 text-[14px] leading-[1.6] text-muted">
          {session.name} · {when} at{" "}
          {confirmed.locationName ?? location.short_name}. We&rsquo;ve emailed your
          confirmation to <b className="text-text">{values.email}</b>.
        </p>
        <p className="mt-3 text-[13px] text-muted">
          Paid {formatINR(confirmed.amountCharged)} · Booking{" "}
          <b className="text-text">{confirmed.bookingId.slice(0, 8)}</b>
        </p>
        <Button className="mt-6" block onClick={onClose}>
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
          Booking online is launching soon
        </div>
        <p className="m-0 text-[14px] leading-[1.6] text-muted">
          We can&rsquo;t take card payments on the site just yet. Call{" "}
          {location.short_name} and the desk will book you straight into{" "}
          <b className="text-text">{session.name}</b> on {when} — your place is
          not held until you do.
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
          Nothing has been charged and no booking has been made.
        </p>
        <Button className="mt-5" block onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------- slot went away
  if (phase === "unavailable") {
    return (
      <div>
        <div className="mb-3 font-display text-[24px] font-semibold uppercase" id={headingId}>
          That slot isn&rsquo;t available
        </div>
        <p className="m-0 text-[14px] leading-[1.6] text-muted">{error}</p>
        <Button className="mt-6" block onClick={onClose}>
          Pick another class
        </Button>
      </div>
    );
  }

  // --------------------------------------------------------------- in flight
  if (phase === "quoting") return <Spinner label="Checking that slot…" />;
  if (phase === "paying") return <Spinner label="Opening payment…" />;

  // ------------------------------------------------------ price confirmation
  if (phase === "confirm" && quote) {
    return (
      <div>
        <div className="mb-1 font-display text-[24px] font-semibold uppercase" id={headingId}>
          Confirm your booking
        </div>
        <p className="m-0 mb-5 text-[13px] text-muted">
          Check the details, then pay to hold your spot.
        </p>

        <dl className="m-0 rounded-field border border-line">
          <Row label="Class" value={quote.name} />
          <Row
            label="When"
            value={`${DAY_LABELS_FULL[quote.dayOfWeek]} ${formatTime(quote.startTime)} · ${formatDuration(quote.durationMin)}`}
          />
          {quote.instructorName ? (
            <Row label="Coach" value={quote.instructorName} />
          ) : null}
          <Row label="Gym" value={quote.locationName ?? location.name} />
          <Row label="Name" value={values.name} />
          <Row label="Mobile" value={formatPhone(values.phone)} />
          <Row
            label="Total"
            value={formatINR(quote.amount)}
            emphasis
          />
        </dl>

        {quote.spotsLeft <= 3 ? (
          <p className="mt-3 text-[12px] font-semibold text-accent">
            Only {quote.spotsLeft} spot{quote.spotsLeft === 1 ? "" : "s"} left.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 text-[13px] leading-[1.6] text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="mt-5" block onClick={pay}>
          Pay {formatINR(quote.amount)}
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
    <form onSubmit={submitDetails} noValidate>
      <div className="mb-1 font-display text-[24px] font-semibold uppercase" id={headingId}>
        Book {session.name}
      </div>
      <p className="m-0 mb-5 text-[13px] text-muted">
        {when} · {formatDuration(session.durationMin)} at {location.short_name}
        {session.instructorName ? ` · ${session.instructorName}` : ""}
        {/*
          Indicative: the amount actually charged is re-quoted from the
          authoritative price endpoint on the next step, so this can never be
          the number someone is billed.
        */}
        {session.priceNonMember > 0 ? (
          <> · <b className="text-text">{formatINR(session.priceNonMember)}</b></>
        ) : null}
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
          hint="We'll text your booking confirmation here."
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
      <p className="mt-3 text-center text-[11px] leading-[1.6] text-muted">
        Class fee is charged at booking. Cancellations follow the gym&rsquo;s class
        policy.
      </p>
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

/**
 * Shown only when the API reports `test_mode: true` on the order — never
 * inferred from the shape of a key, so it cannot lie in either direction.
 */
function TestModeRibbon() {
  return (
    <div className="mb-4 rounded-pill border border-accent bg-accent-soft px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-text">
      Test mode — no real money moved
    </div>
  );
}
