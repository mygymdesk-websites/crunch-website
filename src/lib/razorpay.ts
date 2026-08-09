/**
 * Razorpay Checkout — the browser half of the payment leg.
 *
 * NOT REACHABLE YET. The gym has no gateway connected, so `/api/booking/order`
 * answers `503 gateway_not_configured` and the modal branches away before it
 * gets here. This exists so switching the gateway on is a resume: the script
 * loads on demand at the pay step, never on page load, so no visitor downloads
 * a payment SDK to read the timetable.
 */

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpayCapture {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  /** Absent on connected-account (OAuth) gyms; MGD verifies either way. */
  razorpay_signature?: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: unknown) => void): void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loading: Promise<RazorpayConstructor> | null = null;

/** Injects Checkout once and resolves with the constructor. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout is browser-only"));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;

  loading = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay Checkout loaded but did not register"));
    };
    script.onerror = () => {
      loading = null; // let a later attempt retry rather than fail forever
      reject(new Error("Could not load Razorpay Checkout"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

/**
 * Opens Checkout and resolves with the capture, or rejects if the customer
 * dismisses it or the payment fails.
 *
 * `amount` must be in PAISE — it comes straight from `/api/booking/order`,
 * which passes through MyGymDesk's server-resolved figure. Nothing here
 * computes or adjusts an amount; that is the whole point of order-first.
 */
export async function openRazorpayCheckout(args: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  customer: { name: string; phone: string; email: string };
}): Promise<RazorpayCapture> {
  const Razorpay = await loadRazorpay();

  return new Promise<RazorpayCapture>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const checkout = new Razorpay({
      key: args.keyId,
      order_id: args.orderId,
      amount: args.amount,
      currency: args.currency,
      name: args.name,
      description: args.description,
      // Prefill happens HERE, in the browser — the customer fields sent to
      // `website-booking-order` only tag the order for the gym's reconciliation.
      prefill: {
        name: args.customer.name,
        contact: args.customer.phone,
        email: args.customer.email,
      },
      handler: (response: RazorpayCapture) => finish(() => resolve(response)),
      modal: {
        ondismiss: () =>
          finish(() => reject(new Error("Payment window was closed."))),
      },
    });

    checkout.on("payment.failed", () =>
      finish(() =>
        reject(new Error("The payment did not go through. Nothing was charged.")),
      ),
    );

    checkout.open();
  });
}
