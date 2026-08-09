import "server-only";

/**
 * Shiprocket — courier fulfilment.
 *
 * ENV-GATED AND UNVERIFIED AGAINST THE LIVE API. The client's credentials have
 * not arrived, so nothing here has ever exchanged a real request. It is typed
 * from the published shapes and unit-tested against recorded ones; treat every
 * response field as unconfirmed until someone runs it with real keys.
 *
 * `isShiprocketConfigured()` is the switch the admin UI reads. With no
 * credentials the "Create shipment" button renders disabled rather than
 * throwing — an integration that is merely absent should look absent, not
 * broken.
 *
 * Auth is a login-for-token exchange: Shiprocket has no long-lived API key, so
 * the token is fetched on demand and cached in module scope for its lifetime.
 * That is per-instance rather than shared, which is fine — a cold instance
 * simply logs in again.
 */

const BASE = "https://apiv2.shiprocket.in/v1/external";

/** Shiprocket tokens last 10 days; refresh well inside that. */
const TOKEN_TTL_MS = 8 * 24 * 60 * 60 * 1000;

export interface ShiprocketAddress {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface ShiprocketLine {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface ShiprocketCreatedOrder {
  orderId: string;
  shipmentId: string;
  status: string | null;
  awb: string | null;
  courier: string | null;
}

export interface ShiprocketAwb {
  awb: string;
  courier: string | null;
  labelUrl: string | null;
}

export interface ShiprocketTracking {
  status: string | null;
  statusDetail: string | null;
  deliveredAt: string | null;
  expectedDeliveryAt: string | null;
  raw: unknown;
}

export class ShiprocketError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ShiprocketError";
    this.status = status;
  }
}

export function isShiprocketConfigured(): boolean {
  return Boolean(
    process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD,
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Exposed for tests: forget the cached token. */
export function resetShiprocketToken(): void {
  cachedToken = null;
}

async function login(fetchImpl: typeof fetch): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.token;

  const res = await fetchImpl(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as { token?: string; message?: string } | null;
  if (!res.ok || !body?.token) {
    throw new ShiprocketError(res.status, body?.message ?? "Shiprocket login failed");
  }

  cachedToken = { token: body.token, expiresAt: now + TOKEN_TTL_MS };
  return body.token;
}

async function call<T>(
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<T> {
  const token = await login(fetchImpl);
  const res = await fetchImpl(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body as { message?: string } | null)?.message ??
      `Shiprocket ${path} failed (${res.status})`;
    throw new ShiprocketError(res.status, message);
  }
  return body as T;
}

export interface ShiprocketClient {
  createOrder(input: {
    orderNumber: string;
    placedAt: string;
    billing: ShiprocketAddress;
    lines: ShiprocketLine[];
    subTotal: number;
    pickupLocation?: string;
  }): Promise<ShiprocketCreatedOrder>;
  assignAwb(shipmentId: string): Promise<ShiprocketAwb>;
  track(awb: string): Promise<ShiprocketTracking>;
}

/**
 * @param fetchImpl injected so the unit tests can drive recorded shapes
 *        without a network or credentials.
 */
export function shiprocket(fetchImpl: typeof fetch = fetch): ShiprocketClient {
  return {
    async createOrder(input) {
      const payload = {
        order_id: input.orderNumber,
        order_date: input.placedAt,
        pickup_location: input.pickupLocation ?? "Primary",
        billing_customer_name: input.billing.name,
        billing_last_name: "",
        billing_address: input.billing.line1,
        billing_address_2: input.billing.line2 ?? "",
        billing_city: input.billing.city,
        billing_pincode: input.billing.postalCode,
        billing_state: input.billing.state,
        billing_country: input.billing.country ?? "India",
        billing_email: input.billing.email,
        billing_phone: input.billing.phone,
        shipping_is_billing: true,
        order_items: input.lines.map((l) => ({
          name: l.name,
          sku: l.sku,
          units: l.quantity,
          selling_price: l.unitPrice,
        })),
        payment_method: "Prepaid",
        sub_total: input.subTotal,
        // Shiprocket requires physical dimensions. These are deliberate
        // placeholders for gym retail (supplements, apparel) and should be
        // driven from real product data once anyone weighs a parcel.
        length: 20,
        breadth: 15,
        height: 10,
        weight: 1,
      };

      const body = await call<{
        order_id?: number | string;
        shipment_id?: number | string;
        status?: string;
        awb_code?: string | null;
        courier_name?: string | null;
      }>("/orders/create/adhoc", { method: "POST", body: JSON.stringify(payload) }, fetchImpl);

      return {
        orderId: String(body.order_id ?? ""),
        shipmentId: String(body.shipment_id ?? ""),
        status: body.status ?? null,
        awb: body.awb_code ?? null,
        courier: body.courier_name ?? null,
      };
    },

    async assignAwb(shipmentId) {
      const body = await call<{
        response?: {
          data?: {
            awb_code?: string;
            courier_name?: string;
            label_url?: string;
          };
        };
      }>(
        "/courier/assign/awb",
        { method: "POST", body: JSON.stringify({ shipment_id: shipmentId }) },
        fetchImpl,
      );

      const data = body.response?.data;
      if (!data?.awb_code) {
        throw new ShiprocketError(502, "Shiprocket assigned no AWB");
      }
      return {
        awb: data.awb_code,
        courier: data.courier_name ?? null,
        labelUrl: data.label_url ?? null,
      };
    },

    async track(awb) {
      const body = await call<{
        tracking_data?: {
          shipment_status?: string;
          shipment_track?: Array<{
            current_status?: string;
            delivered_date?: string | null;
            edd?: string | null;
          }>;
        };
      }>(`/courier/track/awb/${encodeURIComponent(awb)}`, { method: "GET" }, fetchImpl);

      const track = body.tracking_data?.shipment_track?.[0];
      return {
        status: body.tracking_data?.shipment_status ?? null,
        statusDetail: track?.current_status ?? null,
        deliveredAt: track?.delivered_date ?? null,
        expectedDeliveryAt: track?.edd ?? null,
        raw: body,
      };
    },
  };
}
