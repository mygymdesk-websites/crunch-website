import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The courier webhook path, pinned.
 *
 * Their panel silently refuses a webhook URL containing their own name, and
 * also rejects the substrings "sr" and "kr" anywhere in the path. That is an
 * external constraint with no trace in the code: nothing about
 * `/api/shipping/webhook` explains why it isn't called what it is, and the
 * obvious "tidy-up" is to rename it back.
 *
 * These assertions are cheap and they fail loudly at the moment someone does.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const LIVE_PATH = "api/shipping/webhook";
const RETIRED_PATH = "api/shiprocket/webhook";

/** Substrings the courier's panel rejects in a webhook URL. */
const REJECTED = ["sr", "kr", "shiprocket"];

describe("courier webhook path", () => {
  it("contains none of the substrings the courier's panel rejects", () => {
    for (const bad of REJECTED) {
      expect(LIVE_PATH.toLowerCase()).not.toContain(bad);
    }
  });

  it("still resolves to a route file", () => {
    expect(existsSync(join(root, "src", "app", LIVE_PATH, "route.ts"))).toBe(true);
  });

  it("keeps the retired path present, to answer 410 rather than 404", () => {
    // A 404 reads as "wrong URL, try again"; a 410 tells a sender to stop.
    expect(existsSync(join(root, "src", "app", RETIRED_PATH, "route.ts"))).toBe(
      true,
    );
  });
});
