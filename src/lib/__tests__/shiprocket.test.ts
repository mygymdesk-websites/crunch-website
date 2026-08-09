import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ShiprocketError,
  isShiprocketConfigured,
  resetShiprocketToken,
  shiprocket,
} from "../shiprocket";

/**
 * Shiprocket, against RECORDED shapes.
 *
 * The client's credentials have not arrived, so none of this has spoken to the
 * live API. These tests pin the request bodies and the response parsing so that
 * when real keys land, a mismatch shows up as a failing test rather than as a
 * parcel that never ships. Anything here is shape-verified, not live-verified.
 */

type Call = { url: string; init: RequestInit };

function harness(
  handlers: Array<(url: string) => { status?: number; body: unknown }>,
) {
  const calls: Call[] = [];
  let i = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const handler = handlers[Math.min(i++, handlers.length - 1)];
    const { status = 200, body } = handler(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const LOGIN_OK = () => ({ body: { token: "tok_recorded" } });

beforeEach(() => {
  resetShiprocketToken();
  process.env.SHIPROCKET_EMAIL = "ops@example.com";
  process.env.SHIPROCKET_PASSWORD = "secret";
});

afterEach(() => {
  delete process.env.SHIPROCKET_EMAIL;
  delete process.env.SHIPROCKET_PASSWORD;
  resetShiprocketToken();
});

describe("configuration gate", () => {
  it("reports unconfigured when either credential is missing", () => {
    delete process.env.SHIPROCKET_PASSWORD;
    expect(isShiprocketConfigured()).toBe(false);
    process.env.SHIPROCKET_PASSWORD = "secret";
    expect(isShiprocketConfigured()).toBe(true);
  });
});

describe("createOrder", () => {
  it("logs in once, then sends the adhoc order in Shiprocket's field names", async () => {
    const { fetchImpl, calls } = harness([
      LOGIN_OK,
      () => ({
        body: {
          order_id: 1234,
          shipment_id: 5678,
          status: "NEW",
          awb_code: null,
          courier_name: null,
        },
      }),
    ]);

    const result = await shiprocket(fetchImpl).createOrder({
      orderNumber: "CF-S-1",
      placedAt: "2026-08-09 10:00",
      pickupLocation: "ZZ Test Pickup",
      billing: {
        name: "Asha Menon",
        phone: "9876543210",
        email: "asha@example.com",
        line1: "12 MG Road",
        city: "ZZ Test City",
        state: "ZZ Test State",
        postalCode: "999999",
      },
      lines: [{ name: "Whey", sku: "WHEY-1", quantity: 2, unitPrice: 2499 }],
      subTotal: 4998,
    });

    expect(calls[0].url).toContain("/auth/login");
    expect(calls[1].url).toContain("/orders/create/adhoc");

    const body = JSON.parse(calls[1].init.body as string);
    expect(body.order_id).toBe("CF-S-1");
    expect(body.billing_pincode).toBe("999999");
    expect(body.shipping_is_billing).toBe(true);
    expect(body.order_items[0]).toMatchObject({
      sku: "WHEY-1",
      units: 2,
      selling_price: 2499,
    });
    // Ids come back as numbers and are used as strings downstream.
    expect(result).toMatchObject({ orderId: "1234", shipmentId: "5678" });
  });

  it("normalises the empty strings a real order actually returns", async () => {
    // RECORDED FROM LIVE. A fresh order comes back with awb_code and
    // courier_name as "", not null — `??` does not catch that, so an empty
    // string would reach the database and then render as a blank where the UI
    // falls back to "No AWB yet".
    const { fetchImpl } = harness([
      LOGIN_OK,
      () => ({
        body: {
          order_id: 1506469143,
          channel_order_id: "ZZ-TEST-1",
          shipment_id: 1502690143,
          status: "NEW",
          status_code: 1,
          awb_code: "",
          courier_company_id: "",
          courier_name: "",
          new_channel: false,
          packaging_box_error: "",
        },
      }),
    ]);

    const result = await shiprocket(fetchImpl).createOrder({
      orderNumber: "CF-S-1",
      placedAt: "2026-08-09 10:00",
      pickupLocation: "ZZ Test Pickup",
      billing: {
        name: "A",
        phone: "9876543210",
        email: "a@b.com",
        line1: "L1",
        city: "C",
        state: "S",
        postalCode: "999999",
      },
      lines: [],
      subTotal: 0,
    });

    expect(result.awb).toBeNull();
    expect(result.courier).toBeNull();
    expect(result.status).toBe("NEW");
    // Ids arrive as numbers and are carried as strings.
    expect(result.orderId).toBe("1506469143");
    expect(result.shipmentId).toBe("1502690143");
  });

  it("reuses the cached token rather than logging in per call", async () => {
    const { fetchImpl, calls } = harness([
      LOGIN_OK,
      () => ({ body: { order_id: 1, shipment_id: 2 } }),
      () => ({ body: { order_id: 3, shipment_id: 4 } }),
    ]);

    const client = shiprocket(fetchImpl);
    const args = {
      orderNumber: "CF-S-1",
      placedAt: "2026-08-09 10:00",
      pickupLocation: "ZZ Test Pickup",
      billing: {
        name: "A",
        phone: "9876543210",
        email: "a@b.com",
        line1: "L1",
        city: "C",
        state: "S",
        postalCode: "999999",
      },
      lines: [],
      subTotal: 0,
    };
    await client.createOrder(args);
    await client.createOrder({ ...args, orderNumber: "CF-S-2" });

    expect(calls.filter((c) => c.url.includes("/auth/login"))).toHaveLength(1);
  });

  it("surfaces a login failure as a ShiprocketError, not a parse crash", async () => {
    const { fetchImpl } = harness([
      () => ({ status: 403, body: { message: "Invalid credentials" } }),
    ]);

    await expect(
      shiprocket(fetchImpl).createOrder({
        orderNumber: "CF-S-1",
        placedAt: "2026-08-09 10:00",
        pickupLocation: "ZZ Test Pickup",
        billing: {
          name: "A",
          phone: "9876543210",
          email: "a@b.com",
          line1: "L1",
          city: "C",
          state: "S",
          postalCode: "999999",
        },
        lines: [],
        subTotal: 0,
      }),
    ).rejects.toBeInstanceOf(ShiprocketError);
  });
});

describe("pickup locations", () => {
  it("reads the nickname, which is what an order actually references", async () => {
    // RECORDED FROM LIVE. The client used to default to "Primary"; the real
    // account calls its only address "Home", so that default would have failed
    // the first real shipment. There is no safe guess — it must be resolved.
    const { fetchImpl, calls } = harness([
      LOGIN_OK,
      () => ({
        body: {
          data: {
            shipping_address: [
              {
                id: 91301245,
                pickup_location: "Home",
                city: "ZZ Test City",
                pin_code: 999999,
                status: 2,
              },
            ],
            recent_addresses: [],
          },
        },
      }),
    ]);

    const locations = await shiprocket(fetchImpl).listPickupLocations();
    expect(calls[1].url).toContain("/settings/company/pickup");
    expect(locations).toEqual([
      { id: 91301245, name: "Home", city: "ZZ Test City", pin: "999999" },
    ]);
  });

  it("returns an empty list when the account has no address configured", async () => {
    // The live shape for "none configured" is a null, not an empty array.
    const { fetchImpl } = harness([
      LOGIN_OK,
      () => ({ body: { data: { shipping_address: null, recent_addresses: [] } } }),
    ]);
    await expect(shiprocket(fetchImpl).listPickupLocations()).resolves.toEqual([]);
  });
});

describe("assignAwb", () => {
  it("reads the AWB out of Shiprocket's nested response envelope", async () => {
    const { fetchImpl } = harness([
      LOGIN_OK,
      () => ({
        body: {
          response: {
            data: {
              awb_code: "AWB123456",
              courier_name: "Delhivery",
              label_url: "https://example.com/label.pdf",
            },
          },
        },
      }),
    ]);

    await expect(shiprocket(fetchImpl).assignAwb("5678")).resolves.toEqual({
      awb: "AWB123456",
      courier: "Delhivery",
      labelUrl: "https://example.com/label.pdf",
    });
  });

  it("refuses a 200 that carries no AWB rather than storing an empty one", async () => {
    // Shiprocket answers 200 with an empty envelope when no courier is
    // serviceable. Storing that would mark an order shipped with nothing to
    // track, which is worse than failing here.
    const { fetchImpl } = harness([LOGIN_OK, () => ({ body: { response: { data: {} } } })]);

    await expect(shiprocket(fetchImpl).assignAwb("5678")).rejects.toBeInstanceOf(
      ShiprocketError,
    );
  });
});

describe("track", () => {
  it("flattens the tracking envelope and keeps the raw payload", async () => {
    const { fetchImpl, calls } = harness([
      LOGIN_OK,
      () => ({
        body: {
          tracking_data: {
            shipment_status: "IN TRANSIT",
            shipment_track: [
              {
                current_status: "Out for delivery",
                delivered_date: null,
                edd: "2026-08-12",
              },
            ],
          },
        },
      }),
    ]);

    const result = await shiprocket(fetchImpl).track("AWB123456");
    expect(calls[1].url).toContain("/courier/track/awb/AWB123456");
    expect(result).toMatchObject({
      status: "IN TRANSIT",
      statusDetail: "Out for delivery",
      expectedDeliveryAt: "2026-08-12",
    });
    expect(result.raw).toBeTruthy();
  });

  it("survives an empty tracking envelope", async () => {
    const { fetchImpl } = harness([LOGIN_OK, () => ({ body: {} })]);
    await expect(shiprocket(fetchImpl).track("AWB1")).resolves.toMatchObject({
      status: null,
      statusDetail: null,
    });
  });
});
