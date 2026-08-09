import {
  DISPLAY_REVALIDATE_SECONDS,
  MgdClient,
  type MgdClientOptions,
} from "./client";
import type {
  BookingOrderRequest,
  BookingOrderResponse,
  BookingRequest,
  BookingResponse,
  BookingType,
  CaptureLeadRequest,
  CaptureLeadResponse,
  ClassCatalogResponse,
  ClassSessionsResponse,
  MembershipOrderRequest,
  MembershipOrderResponse,
  MembershipPurchaseRequest,
  MembershipPurchaseResponse,
  PlansResponse,
  ProductQuery,
  ProductsResponse,
  ServiceSessionsResponse,
  ServicesCatalogResponse,
  SessionPriceResponse,
  ShopOrderConfirmRequest,
  ShopOrderConfirmResponse,
  ShopOrderCreateRequest,
  ShopOrderCreateResponse,
} from "./types";

/**
 * The typed MyGymDesk Website API surface.
 *
 * One method per endpoint in `website-api-integration.md` v1.1, plus typed
 * stubs for the Phase 4–5 endpoints Track A has not shipped yet.
 *
 * Cache policy, and why:
 *   - display reads (plans, catalogs, timetable) cache for 15 minutes, because
 *     all endpoints share ONE hourly budget per key and public traffic would
 *     otherwise exhaust it;
 *   - `getClassSessions({ fresh: true })` bypasses that cache. A session `id`
 *     is the next real occurrence and changes as occurrences pass, so it MUST
 *     be re-read immediately before creating a booking order;
 *   - everything that writes is `no-store` by construction.
 *
 * Cache tags let an admin action or a future webhook drop a specific read
 * without waiting out the window.
 */
export const MGD_TAGS = {
  plans: "mgd:plans",
  classCatalog: "mgd:class-catalog",
  classSessions: "mgd:class-sessions",
  serviceCatalog: "mgd:service-catalog",
  serviceSessions: "mgd:service-sessions",
  products: "mgd:products",
} as const;

export interface LocationFilter {
  /** MGD branch UUID (`site_settings.mgd_location_id`). Omit for all branches. */
  locationId?: string | null;
}

export interface FreshnessOption {
  /** Skip the cache. Required before any booking call. */
  fresh?: boolean;
}

export class MgdApi {
  readonly client: MgdClient;

  constructor(options: MgdClientOptions | MgdClient = {}) {
    this.client =
      options instanceof MgdClient ? options : new MgdClient(options);
  }

  get isConfigured(): boolean {
    return this.client.isConfigured;
  }

  // -------------------------------------------------------------------------
  // Leads
  // -------------------------------------------------------------------------

  /**
   * Create a lead, or record a re-enquiry against an existing one.
   *
   * De-duplicated on the LAST 10 DIGITS of the phone, per gym — so
   * `+91 98765 43210`, `09876543210` and `9876543210` are the same person.
   * A new phone returns 201 `created`; a repeat returns 200 `updated`.
   *
   * Every value is cast to a string first: a numeric `phone` causes a 500.
   * There is no spam protection on the API side — the caller owns the honeypot
   * and throttle.
   */
  async captureLead(input: CaptureLeadRequest): Promise<CaptureLeadResponse> {
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null || value === "") continue;
      body[key] = String(value);
    }
    return this.client.request<CaptureLeadResponse>("capture-website-lead", {
      method: "POST",
      body,
    });
  }

  // -------------------------------------------------------------------------
  // Shop catalogue  *(1.4)*
  // -------------------------------------------------------------------------

  /**
   * Published shop products with live stock status.
   *
   * Only products the owner has explicitly published to the website appear —
   * POS-only inventory never leaks. `price` is the ALL-IN charged amount, so
   * display it as-is. `mrp` is omitted unless it is above `price`.
   *
   * Stock is tri-state (`in_stock` / `low_stock` / `out_of_stock`) and exact
   * quantities are never exposed — a "only 3 left" badge would be invented.
   */
  async getProducts(query: ProductQuery = {}): Promise<ProductsResponse> {
    return this.client.request<ProductsResponse>("website-products", {
      query: {
        location_id: query.locationId,
        category_id: query.categoryId,
        brand: query.brand,
        // Drops only out_of_stock; low_stock stays visible.
        in_stock_only: query.inStockOnly ? "true" : undefined,
      },
      revalidate: DISPLAY_REVALIDATE_SECONDS,
      tags: [MGD_TAGS.products],
    });
  }

  // -------------------------------------------------------------------------
  // Display — memberships & services
  // -------------------------------------------------------------------------

  /**
   * Membership plans + service packages, for the pricing cards.
   *
   * Memberships come from `website-services`, not `website-classes`. A branch
   * filter keeps all (tenant-wide) membership plans and adds that branch's
   * packages. `price: 0` means no price set → render "Contact us".
   */
  async getPlans(options: LocationFilter = {}): Promise<PlansResponse> {
    return this.client.request<PlansResponse>("website-services", {
      query: { resource: "plans", location_id: options.locationId },
      revalidate: DISPLAY_REVALIDATE_SECONDS,
      tags: [MGD_TAGS.plans],
    });
  }

  /** Bookable services (physio, sauna, court hire…). Active + published only. */
  async getServiceCatalog(
    options: LocationFilter = {},
  ): Promise<ServicesCatalogResponse> {
    return this.client.request<ServicesCatalogResponse>("website-services", {
      query: { resource: "catalog", location_id: options.locationId },
      revalidate: DISPLAY_REVALIDATE_SECONDS,
      tags: [MGD_TAGS.serviceCatalog],
    });
  }

  async getServiceSessions(
    options: LocationFilter & FreshnessOption = {},
  ): Promise<ServiceSessionsResponse> {
    return this.client.request<ServiceSessionsResponse>("website-services", {
      query: { resource: "sessions", location_id: options.locationId },
      revalidate: options.fresh ? false : DISPLAY_REVALIDATE_SECONDS,
      tags: [MGD_TAGS.serviceSessions],
    });
  }

  // -------------------------------------------------------------------------
  // Display — classes
  // -------------------------------------------------------------------------

  /** Class types. Tenant-wide, so every row's `locationId` is null. */
  async getClassCatalog(
    options: LocationFilter = {},
  ): Promise<ClassCatalogResponse> {
    return this.client.request<ClassCatalogResponse>("website-classes", {
      query: { resource: "catalog", location_id: options.locationId },
      revalidate: DISPLAY_REVALIDATE_SECONDS,
      tags: [MGD_TAGS.classCatalog],
    });
  }

  /**
   * The weekly recurring timetable.
   *
   * Pass `{ fresh: true }` immediately before booking. Each row's `id` is the
   * next real occurrence and rolls forward as occurrences pass; booking a
   * cached id books the wrong day or fails outright.
   */
  async getClassSessions(
    options: LocationFilter & FreshnessOption = {},
  ): Promise<ClassSessionsResponse> {
    return this.client.request<ClassSessionsResponse>("website-classes", {
      query: { resource: "sessions", location_id: options.locationId },
      revalidate: options.fresh ? false : DISPLAY_REVALIDATE_SECONDS,
      tags: [MGD_TAGS.classSessions],
    });
  }

  // -------------------------------------------------------------------------
  // Pricing
  // -------------------------------------------------------------------------

  /**
   * Authoritative price for one session.
   *
   * Optional — bookings resolve and verify the price server-side regardless.
   * Use it to render the amount before sending someone to checkout.
   *
   * `valid: false` arrives with HTTP 200 and means "exists, but has no price".
   * Branch on the field, not the status.
   */
  async getSessionPrice(args: {
    sessionId: string;
    bookingType: BookingType;
    /**
     * Classes only, where it is an accepted no-op. Sending it with
     * `booking_type=service` is `422 member_pricing_unsupported` as of 1.3 —
     * this client refuses to send it rather than letting the API reject the
     * request, because the same mistake on `website-booking-order` used to
     * mint an order at the member rate and then fail the booking on
     * `amount_mismatch` AFTER the customer had paid.
     */
    isMember?: boolean;
  }): Promise<SessionPriceResponse> {
    return this.client.request<SessionPriceResponse>("website-session-price", {
      query: {
        session_id: args.sessionId,
        booking_type: args.bookingType,
        is_member:
          args.isMember && args.bookingType === "class" ? "true" : undefined,
      },
      // Prices feed a checkout screen; a stale one produces amount_mismatch.
      revalidate: false,
    });
  }

  // -------------------------------------------------------------------------
  // Booking (Razorpay order-first)
  // -------------------------------------------------------------------------

  /**
   * Mint a Razorpay order server-side, so the amount comes from the gym's own
   * data and never from the client.
   *
   * `amount` in the response is in PAISE — feed it straight to Checkout.
   * PayPal gyms skip this endpoint entirely (they capture client-side); a
   * `503 gateway_not_configured` is the signal to try that path.
   */
  async createBookingOrder(
    input: BookingOrderRequest,
  ): Promise<BookingOrderResponse> {
    // Member pricing was removed from this API in 1.3. Stripping it for
    // services rather than forwarding it keeps a money bug closed: the order
    // used to be minted at the member rate while the booking charges the
    // non-member rate, so the customer paid and was then refused with
    // `amount_mismatch`.
    const body: BookingOrderRequest = { ...input };
    if (body.booking_type === "service") delete body.is_member;

    return this.client.request<BookingOrderResponse>("website-booking-order", {
      method: "POST",
      body,
    });
  }

  /**
   * Record a class booking AFTER payment.
   *
   * MGD verifies the capture against the gym's gateway and re-resolves the
   * amount before writing anything — a forged or replayed capture creates
   * nothing. Never send `payment.amount` / `payment.currency`.
   *
   * Handle explicitly: 409 `slot_full`, 409 `already_booked`,
   * 409 `duplicate_payment`, 410 `session_not_bookable`.
   */
  async createClassBooking(input: BookingRequest): Promise<BookingResponse> {
    return this.client.request<BookingResponse>("website-class-booking", {
      method: "POST",
      body: input,
    });
  }

  /** As above, for a service session. Service bookings allow re-booking. */
  async createServiceBooking(input: BookingRequest): Promise<BookingResponse> {
    return this.client.request<BookingResponse>("website-service-booking", {
      method: "POST",
      body: input,
    });
  }

  // -------------------------------------------------------------------------
  // Shop checkout (1.5)
  // -------------------------------------------------------------------------

  /**
   * Create a shop order and its Razorpay order.
   *
   * Prices are resolved server-side from the same all-in figures the products
   * endpoint displays; the client sends quantities only. Stock is checked per
   * line at the pickup branch first, so `409 insufficient_stock` arrives with
   * `{ product_id, available }` BEFORE any money moves.
   *
   * Note the two amounts in the response: `amount` is rupees for display,
   * `amount_in_paise` is what Checkout takes. Confusing them is a 100x bug.
   */
  async createShopOrder(
    input: ShopOrderCreateRequest,
  ): Promise<ShopOrderCreateResponse> {
    return this.client.request<ShopOrderCreateResponse>(
      "website-shop-order-create",
      { method: "POST", body: input },
    );
  }

  /**
   * Finalize a shop order after payment. Budget-exempt.
   *
   * `oversold: true` is NOT a failure — stock ran out between create and pay,
   * the order is still paid, and the gym reconciles it. Replaying the same
   * capture returns the same result with `already: true`.
   */
  async confirmShopOrder(
    input: ShopOrderConfirmRequest,
  ): Promise<ShopOrderConfirmResponse> {
    return this.client.request<ShopOrderConfirmResponse>("website-shop-order", {
      method: "POST",
      body: input,
    });
  }

  // -------------------------------------------------------------------------
  // Membership purchase (1.5)
  // -------------------------------------------------------------------------

  /**
   * Start a membership purchase. Keep the `purchase_id` from the response —
   * it is what the finalize call takes, under the name `order_id`.
   */
  async createMembershipOrder(
    input: MembershipOrderRequest,
  ): Promise<MembershipOrderResponse> {
    return this.client.request<MembershipOrderResponse>(
      "website-membership-order",
      { method: "POST", body: input },
    );
  }

  /**
   * Finalize a membership purchase after payment. Budget-exempt.
   *
   * Provisions the member, an active subscription, the invoice and Member App
   * access. A repeat purchase by an existing member is a RENEWAL — a new
   * subscription, never an error — so the returned start/end dates are the
   * only thing that tells a renewer what they actually bought.
   */
  async purchaseMembership(
    input: MembershipPurchaseRequest,
  ): Promise<MembershipPurchaseResponse> {
    return this.client.request<MembershipPurchaseResponse>(
      "website-membership-purchase",
      { method: "POST", body: input },
    );
  }
}

let singleton: MgdApi | null = null;

/**
 * The process-wide client, configured from the environment.
 *
 * Server-only by construction — it reads MGD_API_KEY, which is undefined in the
 * browser. `scripts/check-mgd-key-isolation.mjs` enforces that no client
 * component imports it.
 */
export function mgd(): MgdApi {
  singleton ??= new MgdApi();
  return singleton;
}
