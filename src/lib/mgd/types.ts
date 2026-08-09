/**
 * MyGymDesk Website API — response types.
 *
 * Transcribed from `docs/website-api-integration.md` **v1.4 (2026-08-08)**.
 * Field names and nullability match the document exactly; where the document is
 * explicit about a quirk, the quirk is encoded in the type and noted here.
 *
 * Notable contract details that bite if you skim:
 *   - display responses use camelCase `locationId`; booking success bodies use
 *     snake_case `location_id`;
 *   - `website-booking-order.amount` is in PAISE, everything else is rupees;
 *   - a session's `id` is the next real occurrence and CHANGES over time —
 *     never cache it, re-fetch immediately before booking;
 *   - `website-session-price` returns `valid: false` with HTTP 200;
 *   - `?location_id=` is a SUB-FILTER inside the key's scope (1.2). It can
 *     never widen scope; naming another branch is `403 location_out_of_scope`;
 *   - `sport` (classes) is `""` when unset, `category` (services) is `null` —
 *     the asymmetry is real (1.3);
 *   - `currency` on `resource=plans` can be overridden PER ROW (1.3);
 *   - `intervalLabel` can be the empty string when a plan has no duration —
 *     render the price alone rather than an empty suffix (1.3);
 *   - member pricing is gone: `is_member` with `booking_type=service` is
 *     `422 member_pricing_unsupported` (1.3). It remains an accepted no-op on
 *     classes, which have a single fee.
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
  /**
   * Required. Must be 8–15 digits after `+`, spaces, `-`, `(`, `)` are
   * stripped — and NOTHING else is stripped, so a dot or a letter fails.
   * Truncated to 20 chars first.
   */
  phone: string;
  email?: string;
  interest?: string;
  notes?: string;
  /** Defaults to "website" server-side. */
  source?: string;
  /** Page URL / UTM source. Max 500. */
  source_details?: string;
  city?: string;
  /**
   * *(1.4)* File the lead on a specific branch.
   *
   * A tenant-wide key may name any of the gym's branches; a branch key may
   * name only its own. It is a sub-filter — it can never widen the key's
   * scope. Absent ⇒ the key's branch, else the gym's primary branch.
   */
  location_id?: string;
}

export interface CaptureLeadResponse {
  success: boolean;
  message: string;
  lead_id: string;
  /** `created` → HTTP 201 (new phone) · `updated` → HTTP 200 (re-enquiry). */
  action: "created" | "updated";
  /**
   * *(1.4)* Which branch the lead was actually filed on — reflects the
   * fallback too, not just an explicit request `location_id`. Both are null
   * only for a gym with no active branches.
   */
  location_id: string | null;
  location_name: string | null;
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
  /**
   * *(1.3)* Can be overridden PER ROW — two rows in one response may differ.
   * Read it per plan, never once for the list.
   */
  currency: Currency;
  interval: PlanInterval;
  /**
   * Human-readable and always accurate, e.g. "per quarter". Prefer this.
   * *(1.3)* Can be the EMPTY STRING when the plan has no duration set —
   * render the price alone rather than an empty suffix.
   */
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
  /** *(1.3)* `""` when unset — NOT null. Services use `null` for `category`. */
  sport: string;
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
  /** *(1.3)* `""` when unset — NOT null. */
  sport: string;
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
// Shop checkout + membership purchase  *(1.5, LIVE)*
//
// These shapes were SPECULATED in Phase 1 and several guesses were wrong — the
// worst being shop `amount`, which is rupees here with paise in a separate
// field, not the minor-unit figure the guess assumed. They are now written
// from the v1.6 reference. Anything still marked speculative in this file
// should be treated the same way: verified before it carries money.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// website-products — the shop catalogue  *(1.4, LIVE)*
// ---------------------------------------------------------------------------

/**
 * Tri-state stock.
 *
 * Exact quantities are DELIBERATELY never exposed by the API. Any UI that
 * wants to say "only 3 left" is inventing a number — say "Low stock".
 */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface MgdProductCategory {
  id: string;
  name: string;
}

/** Per-branch stock, present only for a tenant-wide key. */
export interface MgdProductBranchStock {
  locationId: string;
  locationName: string;
  stockStatus: StockStatus;
}

export interface MgdProduct {
  id: string;
  name: string;
  /** Owner's public description when set, else the internal one. */
  description: string | null;
  category: MgdProductCategory | null;
  /**
   * THE ALL-IN CHARGED AMOUNT in major units, tax handling included.
   * Display as-is — checkout will never show a different number.
   */
  price: number;
  /**
   * Strike-through list price. OMITTED when not set or not above `price`, so
   * never assert on its presence — check for undefined before rendering.
   */
  mrp?: number;
  currency: Currency;
  unit: string | null;
  sku: string | null;
  imageUrl: string | null;
  /** Free text, nullable. */
  brand: string | null;
  /**
   * Display-only size label ("1kg", "L"). There is NO variant engine — a size
   * run is separate products.
   */
  size: string | null;
  /** Convenience boolean: `stockStatus !== "out_of_stock"`. */
  inStock: boolean;
  /**
   * With a branch key or `?location_id=`, this is that branch's status.
   * For a tenant-wide key it is the whole-gym aggregate — see
   * `stockByLocation` for the per-branch breakdown.
   */
  stockStatus: StockStatus;
  /** Present for a tenant-wide key: per-branch statuses, no counts. */
  stockByLocation?: MgdProductBranchStock[];
  displayOrder: number;
}

/**
 * Note the ENVELOPE: `currency`, `locationId` and `locationName` sit at the
 * top level alongside `products`, not only on each row. Ordering is the
 * owner's display order, then name.
 */
export interface ProductsResponse {
  products: MgdProduct[];
  currency: Currency;
  locationId: string | null;
  locationName: string | null;
}

export interface ProductQuery {
  /** Sub-filter within the key's scope; stock is then that branch's. */
  locationId?: string | null;
  /** Unknown categories return an empty list, not an error. */
  categoryId?: string | null;
  /** Case-insensitive exact match on brand. */
  brand?: string | null;
  /** Drops ONLY `out_of_stock`; `low_stock` stays visible. */
  inStockOnly?: boolean;
}

/** A2 — `POST website-shop-order-create`. */
export interface ShopOrderCreateRequest {
  items: Array<{ product_id: string; quantity: number }>;
  /**
   * REQUIRED, and the API's only notion of place: it is the branch that
   * fulfils the order and whose stock is checked and decremented.
   *
   * The API has no delivery concept at all. For a courier order the website
   * sends the fulfilling branch here and keeps the shipping address in the
   * LOCAL mirror only — MyGymDesk never sees it. See `src/app/api/shop`.
   */
  pickup_location_id: string;
  customer: MgdCustomer;
}

export interface ShopOrderCreateResponse {
  order_id: string;
  /** Gym-facing reference, e.g. "FZ-1042". */
  order_number: string;
  /** MAJOR units (rupees). Display this one. */
  amount: number;
  /** MINOR units (paise). This is the one Razorpay Checkout takes. */
  amount_in_paise: number;
  currency: Currency;
  gateway: string;
  razorpay_order_id: string;
  key_id: string;
  test_mode: boolean;
  collection_method: "own_pg" | "oauth" | (string & {});
  pickup_location_id: string;
  pickup_location_name: string | null;
  lines: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

/** `POST website-shop-order` — finalize after payment. Budget-exempt. */
export interface ShopOrderConfirmRequest {
  order_id: string;
  payment: BookingPayment;
}

export interface ShopOrderConfirmResponse {
  ok: true;
  order_id: string;
  order_number: string;
  invoice_id: string | null;
  invoice_number: string | null;
  status: "paid" | (string & {});
  amount_charged: number;
  currency: Currency;
  /**
   * Stock ran out between create and pay. The order is STILL PAID and is not
   * auto-refunded — the gym reconciles it. Never render this as a failure.
   */
  oversold: boolean;
  member_id: string | null;
  pickup_location_id: string | null;
  pickup_location_name: string | null;
  /** Present when the same capture was replayed. */
  already?: boolean;
}

/** `POST website-membership-order`. */
export interface MembershipOrderRequest {
  plan_id: string;
  customer: MgdCustomer;
  /** ISO date, today..+90d. Omitted means today. A renewer should pass their
   *  current end date so the new subscription starts where the old one ends. */
  start_date?: string;
  location_id?: string;
}

export interface MembershipOrderResponse {
  /** KEEP THIS — it is what the purchase call takes, not `order_id`. */
  purchase_id: string;
  /** The Razorpay order id. */
  order_id: string;
  /** MINOR units (paise). May exceed the plan price when the gym charges an
   *  online-payment fee — present it as the total. */
  amount: number;
  currency: Currency;
  key_id: string;
  test_mode: boolean;
  collection_method: "own_pg" | "oauth" | (string & {});
  plan_id: string;
  plan_name: string;
  duration_days: number;
  location_id: string | null;
  location_name: string | null;
}

/** `POST website-membership-purchase` — finalize after payment. Budget-exempt. */
export interface MembershipPurchaseRequest {
  /** The `purchase_id` from the order call. The field is named `order_id`. */
  order_id: string;
  payment: BookingPayment;
}

export interface MembershipPurchaseResponse {
  ok: true;
  member_id: string;
  subscription_id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  status: "active" | (string & {});
  plan_name: string;
  /** ISO dates. Surface both — for a renewal this is the new term, and it is
   *  the only thing that tells a renewer what they just bought. */
  start_date: string;
  end_date: string;
  amount_charged: number;
  currency: Currency;
  member_portal: { provisioned: boolean };
  location_id: string | null;
  location_name: string | null;
  /** Present when the same capture was replayed. */
  idempotent?: boolean;
}
