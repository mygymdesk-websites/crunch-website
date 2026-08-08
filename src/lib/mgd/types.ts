/**
 * MyGymDesk Website API — response types.
 *
 * Transcribed from `docs/website-api-integration.md` v1.1 (2026-07-20). Field
 * names and nullability match the document exactly; where the document is
 * explicit about a quirk, the quirk is encoded in the type and noted here.
 *
 * Notable contract details that bite if you skim:
 *   - display responses use camelCase `locationId`; booking success bodies use
 *     snake_case `location_id`;
 *   - `website-booking-order.amount` is in PAISE, everything else is rupees;
 *   - a session's `id` is the next real occurrence and CHANGES over time —
 *     never cache it, re-fetch immediately before booking;
 *   - `website-session-price` returns `valid: false` with HTTP 200.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export type Currency = "INR" | (string & {});

/** `1` low · `2` medium · `3` high. Anything unrecognised comes back as 2. */
export type Intensity = 1 | 2 | 3;

export type BookingType = "class" | "service";

export type PaymentGateway = "razorpay" | "paypal";

/** `0` Sunday … `6` Saturday. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface MgdCustomer {
  name: string;
  phone: string;
  email: string;
}

// ---------------------------------------------------------------------------
// capture-website-lead
// ---------------------------------------------------------------------------

/**
 * Every value must be sent as a JSON string — a numeric `phone` causes a 500.
 * Input is silently sanitised (HTML tags and `< > ' " \ ;` stripped) and
 * over-length values truncated, so validate in your own form first.
 */
export interface CaptureLeadRequest {
  /** Required, ≥ 2 chars after sanitising, max 200. */
  name: string;
  /** Required, 8–15 digits; `+`, spaces, `-`, `()` are stripped. Max 20. */
  phone: string;
  email?: string;
  interest?: string;
  notes?: string;
  /** Defaults to "website" server-side. */
  source?: string;
  /** Page URL / UTM source. Max 500. */
  source_details?: string;
  city?: string;
}

export interface CaptureLeadResponse {
  success: boolean;
  message: string;
  lead_id: string;
  /** `created` → HTTP 201 (new phone) · `updated` → HTTP 200 (re-enquiry). */
  action: "created" | "updated";
}

// ---------------------------------------------------------------------------
// website-services?resource=plans — membership & package pricing
// ---------------------------------------------------------------------------

export type PlanInterval =
  | "day_pass"
  | "month"
  | "quarter"
  | "half_year"
  | "year"
  | "custom";

export interface MgdPlan {
  id: string;
  name: string;
  /** Major units (rupees). `0` means no price set → render "Contact us". */
  price: number;
  currency: Currency;
  interval: PlanInterval;
  /** Human-readable and always accurate, e.g. "per quarter". Prefer this. */
  intervalLabel: string;
  /** Raw plan length; use it when `interval` is a value you don't recognise. */
  durationDays: number | null;
  description: string | null;
  features: string[];
  /** The owner's "most popular" pick. At most one across the list. */
  featured: boolean;
  displayOrder: number;
  /** Membership plans are tenant-wide → always null. Packages may be scoped. */
  locationId: string | null;
  locationName: string | null;
}

export interface PlansResponse {
  plans: MgdPlan[];
}

// ---------------------------------------------------------------------------
// website-services?resource=catalog — bookable services
// ---------------------------------------------------------------------------

export interface MgdService {
  id: string;
  name: string;
  category: string | null;
  durationMin: number;
  capacity: number;
  priceMember: number;
  priceNonMember: number;
  currency: Currency;
  requiresStaff: boolean;
  description: string | null;
  locationId: string | null;
  locationName: string | null;
}

export interface ServicesCatalogResponse {
  services: MgdService[];
}

// ---------------------------------------------------------------------------
// website-classes?resource=catalog — class types
// ---------------------------------------------------------------------------

export interface MgdClassType {
  id: string;
  name: string;
  sport: string | null;
  intensity: Intensity;
  durationMin: number;
  description: string | null;
  capacity: number;
  /** Classes have one price, so member == non-member. `0` = no price set. */
  priceMember: number;
  priceNonMember: number;
  currency: Currency;
  /** Class *types* are tenant-wide → always null. */
  locationId: null;
  locationName: null;
}

export interface ClassCatalogResponse {
  classes: MgdClassType[];
}

// ---------------------------------------------------------------------------
// website-classes?resource=sessions — the weekly timetable
// ---------------------------------------------------------------------------

/**
 * A weekly recurring slot, NOT a dated calendar entry. Sessions in the next 90
 * days collapse to one row per (weekday + start time + class type).
 */
export interface MgdClassSession {
  /**
   * The next upcoming real occurrence — this is what you pass to booking.
   * It CHANGES as occurrences pass. Never cache it; re-fetch immediately
   * before creating a booking order.
   */
  id: string;
  /** Stable React key only. NOT bookable. */
  templateKey: string;
  dayOfWeek: DayOfWeek;
  /** "HH:MM" in the gym's local time. No timezone is returned — assume IST. */
  startTime: string;
  durationMin: number;
  name: string;
  sport: string | null;
  instructorName: string | null;
  instructorAvatarUrl: string | null;
  intensity: Intensity;
  spotsTotal: number;
  /** Can under-report on very busy gyms. */
  spotsBooked: number;
  description: string | null;
  capacity: number;
  priceMember: number;
  priceNonMember: number;
  currency: Currency;
  locationId: string | null;
  locationName: string | null;
}

export interface ClassSessionsResponse {
  sessions: MgdClassSession[];
}

/** Same shape as a class session, with `category` for `sport` and no intensity. */
export interface MgdServiceSession
  extends Omit<MgdClassSession, "sport" | "intensity"> {
  category: string | null;
}

export interface ServiceSessionsResponse {
  sessions: MgdServiceSession[];
}

// ---------------------------------------------------------------------------
// website-session-price
// ---------------------------------------------------------------------------

export interface SessionPriceResponse {
  session_id: string;
  booking_type: BookingType;
  amount: number;
  currency: Currency;
  /**
   * `false` arrives with HTTP 200 and means "session exists but has no price".
   * Branch on this field, not on the status code.
   */
  valid: boolean;
}

// ---------------------------------------------------------------------------
// website-booking-order — Razorpay order-first
// ---------------------------------------------------------------------------

export interface BookingOrderRequest {
  session_id: string;
  booking_type: BookingType;
  /** Services only. */
  is_member?: boolean;
  /** Optional; prefills Razorpay Checkout. */
  customer?: Partial<MgdCustomer>;
}

export interface BookingOrderResponse {
  order_id: string;
  /** MINOR units (paise) — hand straight to Razorpay Checkout. */
  amount: number;
  currency: Currency;
  /** The gym's Razorpay checkout key or connected-account public token. */
  key_id: string;
  test_mode: boolean;
  session_id: string;
  booking_type: BookingType;
  /** Informational: `own_pg` or `oauth`. */
  collection_method: "own_pg" | "oauth" | (string & {});
}

// ---------------------------------------------------------------------------
// website-class-booking / website-service-booking
// ---------------------------------------------------------------------------

export interface BookingPaymentRazorpay {
  gateway: "razorpay";
  /** `razorpay_order_id` from Checkout. */
  order_id: string;
  /** `razorpay_payment_id` from Checkout. */
  capture_id: string;
  /** `razorpay_signature` from Checkout (own-keys gyms). */
  signature?: string;
}

export interface BookingPaymentPayPal {
  gateway: "paypal";
  capture_id: string;
}

export type BookingPayment = BookingPaymentRazorpay | BookingPaymentPayPal;

/**
 * Note the deliberate absence of `amount` / `currency`. The server resolves and
 * charges its own figure from the gym's data; sending an amount is ignored at
 * best and a sign of a bug at worst.
 */
export interface BookingRequest {
  session_id: string;
  customer: MgdCustomer;
  payment: BookingPayment;
}

export interface BookingResponse {
  ok: true;
  booking_id: string;
  payment_id: string;
  member_id: string;
  /** Populated only when the booking created a brand-new member. */
  lead_id: string | null;
  status: "confirmed" | (string & {});
  /** Server-resolved figures. */
  amount_charged: number;
  currency: Currency;
  location_id: string | null;
  location_name: string | null;
}

// ---------------------------------------------------------------------------
// Phase 4–5 — NOT YET LIVE on the platform (PRD §3, Track A).
//
// Shapes are specified so the website side is a data-source swap when the MGD
// endpoints deploy, not a rebuild. Calling these today throws
// MgdNotYetLiveError rather than issuing a request against a 404.
// ---------------------------------------------------------------------------

/** A1 — `GET website-products`. */
export interface MgdProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  /** Size or variant label, e.g. "1 kg · Chocolate". */
  variant: string | null;
  /** Major units (rupees). */
  price: number;
  /** MRP for the strikethrough; null when there is no discount. */
  listPrice: number | null;
  stock: number;
  imageUrl: string | null;
  currency: Currency;
  locationId: string | null;
  locationName: string | null;
}

export interface ProductsResponse {
  products: MgdProduct[];
}

/** A2 — `POST website-shop-order-create`. */
export interface ShopOrderCreateRequest {
  items: Array<{ product_id: string; qty: number }>;
  location_id: string;
  customer: MgdCustomer;
}

export interface ShopOrderCreateResponse {
  order_id: string;
  /** MINOR units (paise). */
  amount: number;
  currency: Currency;
  key_id: string;
}

/** A2 — `POST website-shop-order` (post-payment confirm). */
export interface ShopOrderConfirmRequest {
  order_id: string;
  payment: BookingPayment;
  customer: MgdCustomer;
}

export interface ShopOrderConfirmResponse {
  ok: true;
  sale_id: string;
  invoice_id: string | null;
  payment_id: string;
  currency: Currency;
  amount_charged: number;
  location_id: string | null;
  location_name: string | null;
  items: Array<{
    product_id: string;
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
}

/** A3 — `POST website-membership-order`. */
export interface MembershipOrderRequest {
  plan_id: string;
  customer: MgdCustomer;
}

export interface MembershipOrderResponse {
  order_id: string;
  /** MINOR units (paise). */
  amount: number;
  currency: Currency;
  key_id: string;
}

/** A3 — `POST website-membership-purchase` (post-payment confirm). */
export interface MembershipPurchaseRequest {
  plan_id: string;
  customer: MgdCustomer;
  payment: BookingPayment;
  /** Optional GSTIN for a company invoice. */
  gstin?: string;
}

export interface MembershipPurchaseResponse {
  ok: true;
  member_id: string;
  subscription_id: string;
  invoice_id: string;
  payment_id: string;
  amount_charged: number;
  currency: Currency;
  location_id: string | null;
  location_name: string | null;
}
