import { describe, expect, it } from "vitest";

import { MgdApi } from "../api";
import { MgdClient } from "../client";
import { MgdError, MgdNotConfiguredError } from "../errors";

/**
 * The MGD layer is unit-testable without a network: `fetchImpl` is injected.
 * These assert the contract details that are easy to get wrong and expensive
 * to discover in production.
 */

interface Call {
  url: string;
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } };
}

function stubFetch(
  responder: (url: string) => { status?: number; body?: unknown } = () => ({}),
) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: (init ?? {}) as Call["init"] });
    const { status = 200, body = {} } = responder(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  return { calls, fetchImpl };
}

function api(responder?: Parameters<typeof stubFetch>[0]) {
  const { calls, fetchImpl } = stubFetch(responder);
  return {
    calls,
    api: new MgdApi(
      new MgdClient({
        baseUrl: "https://db.mygymdesk.in/functions/v1",
        apiKey: "mgd_live_a7f3k9m2p8q1w5e6r4t7y0u3i8o2p5a9",
        fetchImpl,
      }),
    ),
  };
}

describe("auth + transport", () => {
  it("sends the key in the x-mgd-api-key header, never in the query string", async () => {
    const { api: client, calls } = api(() => ({ body: { plans: [] } }));
    await client.getPlans();

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-mgd-api-key"]).toBe(
      "mgd_live_a7f3k9m2p8q1w5e6r4t7y0u3i8o2p5a9",
    );
    // Query strings land in logs and Referer headers.
    expect(calls[0].url).not.toContain("key=");
  });

  it("throws MgdNotConfiguredError rather than calling with an empty key", async () => {
    const { fetchImpl, calls } = stubFetch();
    const client = new MgdApi(new MgdClient({ apiKey: "", fetchImpl }));

    await expect(client.getPlans()).rejects.toBeInstanceOf(MgdNotConfiguredError);
    expect(calls).toHaveLength(0);
  });

  it("branches on the `error` field, not the message string", async () => {
    const { api: client } = api(() => ({
      status: 409,
      body: { error: "slot_full", message: "Unauthorized" },
    }));

    const err = await client
      .createClassBooking({
        session_id: "s1",
        customer: { name: "Asha Menon", phone: "+919876543210", email: "a@b.in" },
        payment: { gateway: "razorpay", order_id: "o", capture_id: "p" },
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(MgdError);
    expect(err.code).toBe("slot_full");
    expect(err.status).toBe(409);
  });

  it("falls back to the status when an endpoint words its errors differently", async () => {
    // capture-website-lead predates the shared auth layer.
    const { api: client } = api(() => ({
      status: 401,
      body: { error: undefined, message: "Missing or invalid API key" },
    }));

    const err = await client
      .captureLead({ name: "Test Visitor", phone: "9876543210" })
      .catch((e) => e);

    expect(err.status).toBe(401);
    expect(err.code).toBe("unauthorized");
    expect(err.isAuthFailure).toBe(true);
  });

  it("classifies a 429 as rate limited", async () => {
    const { api: client } = api(() => ({
      status: 429,
      body: { error: "rate_limit_exceeded" },
    }));
    const err = await client.getPlans().catch((e) => e);
    expect(err.isRateLimited).toBe(true);
  });
});

describe("caching policy", () => {
  it("caches display reads for 15 minutes, tagged", async () => {
    const { api: client, calls } = api(() => ({ body: { plans: [] } }));
    await client.getPlans();

    expect(calls[0].init.next?.revalidate).toBe(900);
    expect(calls[0].init.next?.tags).toContain("mgd:plans");
  });

  it("bypasses the cache when sessions are requested fresh", async () => {
    // A session id is the next real occurrence and rolls forward; booking a
    // cached id books the wrong slot.
    const { api: client, calls } = api(() => ({ body: { sessions: [] } }));

    await client.getClassSessions();
    expect(calls[0].init.next?.revalidate).toBe(900);

    await client.getClassSessions({ fresh: true });
    expect(calls[1].init.next).toBeUndefined();
    expect(calls[1].init.cache).toBe("no-store");
  });

  it("never caches mutations or session prices", async () => {
    const { api: client, calls } = api(() => ({ body: {} }));

    await client.captureLead({ name: "Test Visitor", phone: "9876543210" });
    await client.getSessionPrice({ sessionId: "s1", bookingType: "class" });

    expect(calls[0].init.cache).toBe("no-store");
    expect(calls[1].init.cache).toBe("no-store");
  });
});

describe("request shaping", () => {
  it("casts every lead field to a string — a numeric phone causes a 500", async () => {
    const { api: client, calls } = api(() => ({ body: {} }));

    await client.captureLead({
      name: "Test Visitor",
      // The API is strict about this; the client is the last line of defence.
      phone: 9876543210 as unknown as string,
      email: "test@example.com",
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.phone).toBe("9876543210");
    expect(typeof body.phone).toBe("string");
  });

  it("drops empty and undefined values instead of sending them", async () => {
    const { api: client, calls } = api(() => ({ body: {} }));

    await client.captureLead({
      name: "Test Visitor",
      phone: "9876543210",
      email: "",
      interest: undefined,
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("interest");
  });

  it("omits location_id from the query when no branch filter is given", async () => {
    const { api: client, calls } = api(() => ({ body: { sessions: [] } }));

    await client.getClassSessions();
    expect(calls[0].url).not.toContain("location_id");

    await client.getClassSessions({ locationId: "abc-123" });
    expect(calls[1].url).toContain("location_id=abc-123");
  });

  it("never sends payment.amount on a booking — the server resolves it", async () => {
    const { api: client, calls } = api(() => ({ body: { ok: true } }));

    await client.createClassBooking({
      session_id: "s1",
      customer: { name: "Asha Menon", phone: "+919876543210", email: "a@b.in" },
      payment: {
        gateway: "razorpay",
        order_id: "order_TFk",
        capture_id: "pay_TFk",
        signature: "sig",
      },
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.payment).not.toHaveProperty("amount");
    expect(body.payment).not.toHaveProperty("currency");
  });
});

describe("website-products (v1.4)", () => {
  it("caches the catalogue for 15 minutes, tagged", async () => {
    const { api: client, calls } = api(() => ({
      body: { products: [], currency: "INR", locationId: null, locationName: null },
    }));
    await client.getProducts();

    expect(calls[0].url).toContain("website-products");
    expect(calls[0].init.next?.revalidate).toBe(900);
    expect(calls[0].init.next?.tags).toContain("mgd:products");
  });

  it("sends only the filters that were given", async () => {
    const { api: client, calls } = api(() => ({ body: { products: [] } }));

    await client.getProducts();
    expect(calls[0].url).not.toContain("location_id");
    expect(calls[0].url).not.toContain("in_stock_only");
    expect(calls[0].url).not.toContain("category_id");

    await client.getProducts({
      locationId: "loc-1",
      categoryId: "cat-1",
      brand: "Optimum Nutrition",
      inStockOnly: true,
    });
    expect(calls[1].url).toContain("location_id=loc-1");
    expect(calls[1].url).toContain("category_id=cat-1");
    expect(calls[1].url).toContain("brand=Optimum+Nutrition");
    expect(calls[1].url).toContain("in_stock_only=true");
  });

  it("omits in_stock_only when false rather than sending false", async () => {
    // `in_stock_only=false` is not a documented value; absence is the default.
    const { api: client, calls } = api(() => ({ body: { products: [] } }));
    await client.getProducts({ inStockOnly: false });
    expect(calls[0].url).not.toContain("in_stock_only");
  });

  it("preserves the response envelope, not just the array", async () => {
    const { api: client } = api(() => ({
      body: {
        products: [{ id: "p1", name: "Whey", stockStatus: "low_stock" }],
        currency: "INR",
        locationId: "loc-1",
        locationName: "Test Branch",
      },
    }));

    const res = await client.getProducts({ locationId: "loc-1" });
    expect(res.locationName).toBe("Test Branch");
    expect(res.currency).toBe("INR");
    expect(res.products[0].stockStatus).toBe("low_stock");
  });
});

describe("lead capture (v1.4 location_id)", () => {
  it("sends location_id so the lead files on the visitor's branch", async () => {
    const { api: client, calls } = api(() => ({ body: { success: true } }));

    await client.captureLead({
      name: "Asha Menon",
      phone: "9876543210",
      location_id: "297b62e2-8fcf-4983-b9fd-12d358bc414d",
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.location_id).toBe("297b62e2-8fcf-4983-b9fd-12d358bc414d");
  });

  it("omits location_id entirely when the location has no MGD branch id", async () => {
    // Absent means "the key's branch, else the gym's primary" — a documented
    // fallback. Sending an empty string instead would be a 400.
    const { api: client, calls } = api(() => ({ body: { success: true } }));

    await client.captureLead({
      name: "Asha Menon",
      phone: "9876543210",
      location_id: undefined,
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body).not.toHaveProperty("location_id");
  });

  it("surfaces location_out_of_scope distinctly", async () => {
    const { api: client } = api(() => ({
      status: 403,
      body: { error: "location_out_of_scope", message: "…" },
    }));

    const err = await client
      .captureLead({ name: "Asha Menon", phone: "9876543210" })
      .catch((e) => e);

    expect(err.code).toBe("location_out_of_scope");
    expect(err.status).toBe(403);
  });
});

describe("member pricing removal (v1.3)", () => {
  it("never sends is_member for a service price check", async () => {
    // `is_member` + booking_type=service is 422 member_pricing_unsupported.
    const { api: client, calls } = api(() => ({ body: { valid: true } }));

    await client.getSessionPrice({
      sessionId: "s1",
      bookingType: "service",
      isMember: true,
    });

    expect(calls[0].url).not.toContain("is_member");
  });

  it("still sends is_member for a class, where it is an accepted no-op", async () => {
    const { api: client, calls } = api(() => ({ body: { valid: true } }));

    await client.getSessionPrice({
      sessionId: "s1",
      bookingType: "class",
      isMember: true,
    });

    expect(calls[0].url).toContain("is_member=true");
  });

  it("strips is_member from a service booking order", async () => {
    // This closed a money bug: the order used to be minted at the member rate
    // while the booking charges the non-member rate, so the customer paid and
    // was then refused with amount_mismatch.
    const { api: client, calls } = api(() => ({ body: { order_id: "o" } }));

    await client.createBookingOrder({
      session_id: "s1",
      booking_type: "service",
      is_member: true,
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body).not.toHaveProperty("is_member");
  });
});

describe("shop + membership request shapes (1.5/1.6)", () => {
  it("sends pickup_location_id and quantity, not location_id and qty", async () => {
    // Phase 1 guessed these names and guessed wrong. The API rejects `qty`
    // outright, and `location_id` would simply be ignored — an order with no
    // branch, whose stock check silently never happened.
    const { api: client, calls } = api(() => ({ body: { order_id: "o" } }));

    await client.createShopOrder({
      items: [{ product_id: "p1", quantity: 2 }],
      pickup_location_id: "loc-1",
      customer: { name: "Asha", phone: "+919876543210", email: "a@b.com" },
    });

    expect(calls[0].url).toContain("website-shop-order-create");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.pickup_location_id).toBe("loc-1");
    expect(body.items[0]).toEqual({ product_id: "p1", quantity: 2 });
    expect(body).not.toHaveProperty("location_id");
  });

  it("finalizes a shop order without echoing the customer back", async () => {
    const { api: client, calls } = api(() => ({ body: { ok: true } }));

    await client.confirmShopOrder({
      order_id: "ord-1",
      payment: {
        gateway: "razorpay",
        order_id: "order_x",
        capture_id: "pay_x",
        signature: "sig",
      },
    });

    expect(calls[0].url).toContain("website-shop-order");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual({
      order_id: "ord-1",
      payment: {
        gateway: "razorpay",
        order_id: "order_x",
        capture_id: "pay_x",
        signature: "sig",
      },
    });
  });

  it("passes start_date and location_id on a membership order when given", async () => {
    const { api: client, calls } = api(() => ({ body: { purchase_id: "pu" } }));

    await client.createMembershipOrder({
      plan_id: "plan-1",
      customer: { name: "Asha", phone: "+919876543210", email: "a@b.com" },
      start_date: "2026-09-01",
      location_id: "loc-1",
    });

    expect(calls[0].url).toContain("website-membership-order");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.plan_id).toBe("plan-1");
    expect(body.start_date).toBe("2026-09-01");
    expect(body.location_id).toBe("loc-1");
  });

  it("finalizes a membership with the purchase_id under the name order_id", async () => {
    // The finalize endpoint takes the purchase_id from the order call, in a
    // field called `order_id` — NOT the Razorpay order id, which also lives in
    // that response under `order_id`. Sending the wrong one is a 404.
    const { api: client, calls } = api(() => ({ body: { ok: true } }));

    await client.purchaseMembership({
      order_id: "purchase-123",
      payment: { gateway: "razorpay", order_id: "order_x", capture_id: "pay_x" },
    });

    expect(calls[0].url).toContain("website-membership-purchase");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.order_id).toBe("purchase-123");
  });
});

describe("network failures", () => {
  it("wraps a transport failure as a retryable MgdError", async () => {
    const fetchImpl = (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch;

    const client = new MgdApi(new MgdClient({ apiKey: "k", fetchImpl }));
    const err = await client.getPlans().catch((e) => e);

    expect(err).toBeInstanceOf(MgdError);
    expect(err.code).toBe("network_error");
    expect(err.isSafeToRetry).toBe(true);
  });
});
