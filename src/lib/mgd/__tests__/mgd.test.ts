import { describe, expect, it } from "vitest";

import { MgdApi } from "../api";
import { MgdClient } from "../client";
import { MgdError, MgdNotConfiguredError, MgdNotYetLiveError } from "../errors";

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

describe("phase 4-5 endpoints", () => {
  it.each([
    ["getProducts", () => api().api.getProducts()],
    ["createShopOrder", () => api().api.createShopOrder({ items: [], location_id: "l", customer: { name: "A", phone: "p", email: "e" } })],
    ["createMembershipOrder", () => api().api.createMembershipOrder({ plan_id: "p", customer: { name: "A", phone: "p", email: "e" } })],
  ])("%s throws MgdNotYetLiveError instead of hitting a 404", async (_name, call) => {
    await expect(call()).rejects.toBeInstanceOf(MgdNotYetLiveError);
  });

  it("does not issue a network request for a not-yet-live endpoint", async () => {
    const { api: client, calls } = api();
    await client.getProducts().catch(() => {});
    expect(calls).toHaveLength(0);
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
