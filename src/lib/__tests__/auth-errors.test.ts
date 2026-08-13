import { describe, expect, it } from "vitest";

import { isTransportFailure } from "../auth-errors";

/**
 * Why this exists: the admin panel was opened on a domain the database proxy
 * did not allow-list, every sign-in died at the CORS preflight, and the form
 * reported "Those details don't match an account". The credentials were fine.
 * Someone reset a password that was never the problem.
 */
describe("isTransportFailure", () => {
  it("recognises Supabase's retryable fetch error", () => {
    expect(
      isTransportFailure({ name: "AuthRetryableFetchError", status: 0 }),
    ).toBe(true);
  });

  it("recognises a blocked or dropped request with no status", () => {
    expect(isTransportFailure({ message: "Failed to fetch" })).toBe(true);
    expect(isTransportFailure({ status: 0, message: "NetworkError" })).toBe(true);
  });

  it("does NOT treat a real credential rejection as transport", () => {
    // 400 invalid_credentials is the server answering. It must keep the
    // neutral message, or the form becomes an account-enumeration oracle.
    expect(
      isTransportFailure({ status: 400, message: "Invalid login credentials" }),
    ).toBe(false);
  });

  it("does not treat a server error as transport either", () => {
    expect(isTransportFailure({ status: 500, message: "internal" })).toBe(false);
  });

  it("survives junk", () => {
    expect(isTransportFailure(null)).toBe(false);
    expect(isTransportFailure(undefined)).toBe(false);
    expect(isTransportFailure("nope")).toBe(false);
  });
});
