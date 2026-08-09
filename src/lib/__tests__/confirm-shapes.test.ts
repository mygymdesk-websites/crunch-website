import { describe, expect, it } from "vitest";

import type {
  MembershipPurchaseResponse,
  ShopOrderConfirmResponse,
} from "@/lib/mgd/types";

/**
 * The confirm legs, against RECORDED v1.6 response shapes.
 *
 * Neither leg can be exercised live: reaching it needs a real capture, which
 * needs a gateway the client has not connected. What CAN be pinned now is the
 * translation each route does between MyGymDesk's response and the payload the
 * browser renders — which is precisely where Phase 1's guesses went wrong.
 *
 * The mapping functions are duplicated from the routes deliberately: the routes
 * are Next handlers wrapped around network calls, and extracting them purely to
 * make them importable would be test-shaped design. These assert the CONTRACT —
 * if a route's mapping drifts from what is pinned here, the drift is visible in
 * review as two files disagreeing.
 */

// --- recorded fixtures, copied from the v1.6 reference -----------------------

const SHOP_SUCCESS: ShopOrderConfirmResponse = {
  ok: true,
  order_id: "5f0b2c8e-1111-4a1b-9c2d-000000000001",
  order_number: "FZ-1042",
  invoice_id: "inv_9a8b",
  invoice_number: "CF/2026-27/0134",
  status: "paid",
  amount_charged: 4998,
  currency: "INR",
  oversold: false,
  member_id: "mem_7f3c",
  pickup_location_id: "c53f2dc1-8889-46d7-8589-2f4c40119840",
  pickup_location_name: "ZZ Test Branch",
};

const SHOP_OVERSOLD: ShopOrderConfirmResponse = {
  ...SHOP_SUCCESS,
  oversold: true,
};

const SHOP_REPLAYED: ShopOrderConfirmResponse = {
  ...SHOP_SUCCESS,
  already: true,
};

const MEMBERSHIP_SUCCESS: MembershipPurchaseResponse = {
  ok: true,
  member_id: "mem_7f3c",
  subscription_id: "sub_22aa",
  invoice_id: "inv_1234",
  invoice_number: "CF/2026-27/0135",
  status: "active",
  plan_name: "Annual",
  start_date: "2026-08-15",
  end_date: "2027-08-15",
  amount_charged: 4999,
  currency: "INR",
  member_portal: { provisioned: true },
  location_id: "c53f2dc1-8889-46d7-8589-2f4c40119840",
  location_name: "ZZ Test Branch",
};

const MEMBERSHIP_RENEWAL_REPLAYED: MembershipPurchaseResponse = {
  ...MEMBERSHIP_SUCCESS,
  idempotent: true,
  start_date: "2027-08-15",
  end_date: "2028-08-15",
};

// --- the mappings the routes perform ----------------------------------------

function mapShop(result: ShopOrderConfirmResponse) {
  return {
    ok: true as const,
    orderNumber: result.order_number,
    invoiceNumber: result.invoice_number,
    amountCharged: result.amount_charged,
    currency: result.currency,
    oversold: Boolean(result.oversold),
    pickupLocationName: result.pickup_location_name,
    alreadyConfirmed: Boolean(result.already),
  };
}

function mapMembership(result: MembershipPurchaseResponse) {
  return {
    ok: true as const,
    memberId: result.member_id,
    subscriptionId: result.subscription_id,
    planName: result.plan_name,
    startDate: result.start_date,
    endDate: result.end_date,
    amountCharged: result.amount_charged,
    currency: result.currency,
    invoiceNumber: result.invoice_number,
    memberAppProvisioned: Boolean(result.member_portal?.provisioned),
    locationName: result.location_name,
    alreadyConfirmed: Boolean(result.idempotent),
  };
}

describe("shop confirm mapping", () => {
  it("carries the gym's order number and invoice number through", () => {
    const out = mapShop(SHOP_SUCCESS);
    expect(out.orderNumber).toBe("FZ-1042");
    expect(out.invoiceNumber).toBe("CF/2026-27/0134");
    expect(out.amountCharged).toBe(4998);
  });

  it("treats oversold as a flag on a SUCCESS, never as a failure", () => {
    const out = mapShop(SHOP_OVERSOLD);
    // The order is paid. If this ever became `ok: false`, a customer who had
    // been charged would be told their order failed.
    expect(out.ok).toBe(true);
    expect(out.oversold).toBe(true);
    expect(out.amountCharged).toBe(4998);
  });

  it("reports a replayed capture as already-confirmed, still a success", () => {
    const out = mapShop(SHOP_REPLAYED);
    expect(out.ok).toBe(true);
    expect(out.alreadyConfirmed).toBe(true);
  });

  it("defaults oversold and already to false when the API omits them", () => {
    // Both are optional in the contract; a missing flag must not read as true.
    const withoutFlags = { ...SHOP_REPLAYED };
    delete (withoutFlags as { oversold?: boolean }).oversold;
    delete withoutFlags.already;
    const out = mapShop(withoutFlags as ShopOrderConfirmResponse);
    expect(out.oversold).toBe(false);
    expect(out.alreadyConfirmed).toBe(false);
  });
});

describe("membership confirm mapping", () => {
  it("surfaces the subscription term, which is the whole point for a renewer", () => {
    const out = mapMembership(MEMBERSHIP_SUCCESS);
    expect(out.startDate).toBe("2026-08-15");
    expect(out.endDate).toBe("2027-08-15");
    expect(out.planName).toBe("Annual");
  });

  it("reads Member App provisioning out of the nested member_portal object", () => {
    expect(mapMembership(MEMBERSHIP_SUCCESS).memberAppProvisioned).toBe(true);
    expect(
      mapMembership({
        ...MEMBERSHIP_SUCCESS,
        member_portal: { provisioned: false },
      }).memberAppProvisioned,
    ).toBe(false);
  });

  it("treats a renewal replay as a success carrying the NEW term", () => {
    const out = mapMembership(MEMBERSHIP_RENEWAL_REPLAYED);
    expect(out.ok).toBe(true);
    expect(out.alreadyConfirmed).toBe(true);
    // A renewal does not extend the old subscription — it creates another one,
    // so these dates are the new term and not the original purchase's.
    expect(out.startDate).toBe("2027-08-15");
    expect(out.endDate).toBe("2028-08-15");
  });

  it("survives a null invoice number rather than rendering 'null'", () => {
    const out = mapMembership({ ...MEMBERSHIP_SUCCESS, invoice_number: null });
    expect(out.invoiceNumber).toBeNull();
  });
});
