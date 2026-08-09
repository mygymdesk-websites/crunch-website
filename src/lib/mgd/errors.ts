/**
 * Error model for the MyGymDesk Website API.
 *
 * The API's own guidance: match on the HTTP status, and branch on the `error`
 * code — never on the message string. `capture-website-lead` predates the
 * shared auth layer and words its failures differently ("Missing or invalid
 * API key" instead of `unauthorized`), and the booking endpoints append a
 * fixed `message: "Unauthorized"` to auth failures. So `status` is the only
 * thing that is consistent across all of them.
 */

/** Documented `error` codes, plus room for ones added after v1.4. */
export type MgdErrorCode =
  // auth / transport
  | "unauthorized"
  | "key_inactive"
  | "origin_not_allowed"
  // 1.6 — the gym's plan does not cover this endpoint. Never consumes budget.
  | "plan_upgrade_required"
  | "rate_limit_exceeded"
  | "method_not_allowed"
  | "internal_error"
  // scope — a key's branch bounds both reads and writes (1.2)
  | "location_out_of_scope"
  | "session_out_of_scope"
  // request shape
  | "invalid_json"
  | "invalid_body"
  // renamed from "unknown resource" in 1.2
  | "unknown_resource"
  | "invalid_location_id"
  | "location_not_found"
  | "invalid_category_id"
  | "invalid_session_id"
  | "invalid_booking_type"
  | "invalid_name"
  | "invalid_phone"
  | "invalid_email"
  | "invalid_gateway"
  | "invalid_capture_id"
  | "invalid_order_id"
  | "payload_too_large"
  // member pricing was removed from this API in 1.3
  | "member_pricing_unsupported"
  // payment verification
  | "payment_verification_failed"
  | "payment_not_captured"
  | "amount_mismatch"
  | "currency_mismatch"
  | "invalid_signature"
  | "order_mismatch"
  | "constraint_violation"
  // booking outcomes
  | "session_not_found"
  | "slot_full"
  | "already_booked"
  | "duplicate_payment"
  | "session_not_bookable"
  | "identity_required"
  | "session_not_priced"
  // shop / membership (1.5)
  | "insufficient_stock"
  | "product_unavailable"
  | "cart_empty"
  | "order_not_priced"
  | "order_not_payable"
  | "order_not_found"
  | "plan_not_found"
  | "plan_not_priced"
  | "invalid_plan_id"
  | "invalid_items"
  | "invalid_quantity"
  | "invalid_start_date"
  // gateway
  | "gateway_not_configured"
  | "gateway_reconnect_required"
  | "gateway_error"
  | "db_lookup_error"
  | "member_create_failed"
  | "lead_write_failed"
  // client-side, not from the API
  | "network_error"
  | "not_configured"
  | "not_yet_live"
  | (string & {});

export class MgdError extends Error {
  readonly status: number;
  readonly code: MgdErrorCode;
  readonly endpoint: string;
  readonly body: unknown;

  constructor(args: {
    status: number;
    code: MgdErrorCode;
    message: string;
    endpoint: string;
    body?: unknown;
  }) {
    super(args.message);
    this.name = "MgdError";
    this.status = args.status;
    this.code = args.code;
    this.endpoint = args.endpoint;
    this.body = args.body;
  }

  /** Key missing/unknown, key toggled off, or origin blocked. */
  get isAuthFailure(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** Hourly budget exhausted. Back off ~60 minutes — there's no Retry-After. */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * True when nothing was written on MyGymDesk's side, so it is safe to show
   * the customer a plain failure and let them retry.
   */
  get isSafeToRetry(): boolean {
    return (
      this.status >= 500 ||
      this.code === "network_error" ||
      this.code === "gateway_error"
    );
  }
}

/**
 * Thrown when the website calls an endpoint that MyGymDesk has not shipped yet
 * (PRD §3 — Track A, Phases 4–5). Distinct from a 404 so a Phase-2 bug can
 * never be mistaken for "the platform is down".
 */
export class MgdNotYetLiveError extends MgdError {
  constructor(endpoint: string, phase: string) {
    super({
      status: 501,
      code: "not_yet_live",
      endpoint,
      message:
        `MyGymDesk endpoint "${endpoint}" is not live yet (lands in ${phase}). ` +
        `Use the typed fixtures until Track A deploys it.`,
    });
    this.name = "MgdNotYetLiveError";
  }
}

/** Thrown when MGD_API_KEY / MGD_API_BASE are missing from the environment. */
export class MgdNotConfiguredError extends MgdError {
  constructor(endpoint: string) {
    super({
      status: 503,
      code: "not_configured",
      endpoint,
      message:
        "MGD_API_KEY is not set. Add it to .env.local (server-side only) " +
        "before calling the MyGymDesk Website API.",
    });
    this.name = "MgdNotConfiguredError";
  }
}

/**
 * Customer-facing copy for the error codes a visitor can actually trigger.
 *
 * Deliberately honest and specific: "that slot just filled" is useful,
 * "something went wrong" is not. Anything not listed falls through to the
 * generic line.
 */
export function humanizeMgdError(error: unknown): string {
  if (!(error instanceof MgdError)) {
    return "Something went wrong at our end. Please try again, or call the gym.";
  }

  switch (error.code) {
    case "location_out_of_scope":
    case "session_out_of_scope":
      // A scope error is a misconfiguration on our side (wrong branch id, or a
      // branch-scoped key), never something the visitor did.
      return "We couldn't load that gym's details. Please try another location, or call us.";
    case "member_pricing_unsupported":
      return "Member pricing is handled in the Member App. This page shows the standard rate.";
    case "payload_too_large":
      return "That message is too long. Please shorten it and try again.";
    case "lead_write_failed":
      return "We couldn't save your enquiry. Please try again, or call the gym.";
    case "slot_full":
      return "That slot filled up while you were booking. Nothing has been charged.";
    case "already_booked":
      return "You already have a booking on this session.";
    case "duplicate_payment":
      return "This payment has already been used for a booking.";
    case "session_not_bookable":
      return "That session has been cancelled or has already run.";
    case "session_not_found":
      return "That session is no longer on the timetable. Pick another slot.";
    case "session_not_priced":
      return "This session has no price set yet. Call the desk and we'll book you in.";
    case "payment_verification_failed":
    case "payment_not_captured":
    case "invalid_signature":
    case "order_mismatch":
      return "We couldn't verify that payment. Nothing has been charged and no booking was made.";
    case "amount_mismatch":
    case "currency_mismatch":
      return "The payment amount didn't match the price. Nothing has been charged.";
    case "plan_upgrade_required":
      // A billing state at the gym, not anything the visitor did. Crunch holds
      // a Full-API grant so this should never appear; if it ever does, the
      // customer still needs a way to complete the thing they came to do.
      return "Online payment is temporarily unavailable. Please call the gym to book.";
    case "insufficient_stock":
      return "There isn't enough stock for one of your items. Adjust the quantity and try again.";
    case "product_unavailable":
      return "One of your items is no longer available. Remove it to continue.";
    case "cart_empty":
      return "Your cart is empty.";
    case "plan_not_found":
      return "That plan is no longer on sale. Refresh the page to see current memberships.";
    case "plan_not_priced":
    case "order_not_priced":
      return "This plan has no price set yet. Contact us and we'll sort it out.";
    case "order_not_payable":
      return "This order has already been paid or cancelled.";
    case "order_not_found":
      return "We couldn't find that order. Please call the gym before paying again.";
    case "gateway_not_configured":
    case "gateway_reconnect_required":
      return "Online payment is temporarily unavailable. Please call the gym to book.";
    case "rate_limit_exceeded":
      return "We're a bit busy right now. Please try again in a few minutes.";
    case "invalid_phone":
      return "Enter a valid 10-digit mobile number.";
    case "invalid_email":
      return "Enter a valid email address.";
    case "invalid_name":
      return "Enter your full name.";
    default:
      return "Something went wrong at our end. Please try again, or call the gym.";
  }
}
