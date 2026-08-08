#!/usr/bin/env node
/**
 * Environment guardrails.
 *
 * Two classes of mistake this catches, both of which are expensive in
 * production and invisible in review:
 *
 *  1. A RAW `*.supabase.co` URL in NEXT_PUBLIC_SUPABASE_URL.
 *
 *     Raw Supabase domains are blocked by several Indian ISPs. Sign-in, the
 *     admin panel and "My Orders" all run in the visitor's browser, so a raw
 *     URL means those simply fail for a chunk of real customers — with no
 *     server-side error to notice. Every Supabase call must go through the
 *     client's Cloudflare-proxied custom domain (e.g. db.crunchfitness.in).
 *
 *     Local dev can opt out with ALLOW_RAW_SUPABASE_URL=true, which is loud
 *     rather than silent, and never applies to a production build.
 *
 *  2. A server-only secret exposed through a NEXT_PUBLIC_* variable.
 *
 *     Next.js inlines every NEXT_PUBLIC_* value into the client bundle by
 *     definition. `check:mgd-key` scans source; this scans the environment,
 *     which is where the mistake actually gets made.
 *
 *   npm run check:env
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/**
 * Load .env.local into a plain object without adding a dependency.
 * process.env still wins — this is only so the check works before Next boots.
 */
function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Real process env takes precedence (Vercel, CI).
      if (env[key] === undefined) env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const errors = [];
const warnings = [];

const isProductionBuild =
  env.VERCEL_ENV === "production" ||
  (env.NODE_ENV === "production" && env.VERCEL_ENV !== "preview");

// ---------------------------------------------------------------------------
// 1. Supabase URL must not be a raw *.supabase.co host
// ---------------------------------------------------------------------------
const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

if (supabaseUrl) {
  let host = "";
  try {
    host = new URL(supabaseUrl).host;
  } catch {
    errors.push(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${JSON.stringify(supabaseUrl)}`,
    );
  }

  if (host && /\.supabase\.(co|in)$/i.test(host)) {
    const message =
      `NEXT_PUBLIC_SUPABASE_URL points at the raw Supabase host "${host}".\n` +
      `    Raw *.supabase.co domains are blocked by several Indian ISPs, and\n` +
      `    Supabase runs in the VISITOR'S browser here (sign-in, admin, My Orders),\n` +
      `    so this breaks for real customers with no server-side error to notice.\n` +
      `    Use the Cloudflare-proxied custom domain instead, e.g. https://db.crunchfitness.in`;

    if (env.ALLOW_RAW_SUPABASE_URL === "true" && !isProductionBuild) {
      warnings.push(
        `${message}\n    (allowed for local dev via ALLOW_RAW_SUPABASE_URL=true — ` +
          `this is a GO-LIVE BLOCKER, see HANDOFF.md)`,
      );
    } else {
      errors.push(
        `${message}\n    For local dev only, set ALLOW_RAW_SUPABASE_URL=true in .env.local.`,
      );
    }
  }

  if (host && !/^https:/i.test(supabaseUrl) && !host.startsWith("localhost")) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL must use https://");
  }
}

// ---------------------------------------------------------------------------
// 2. No server-only secret behind a NEXT_PUBLIC_* name
// ---------------------------------------------------------------------------
const PUBLIC_ALLOWLIST = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
]);

for (const [key, value] of Object.entries(env)) {
  if (!key.startsWith("NEXT_PUBLIC_")) continue;

  if (/MGD|SERVICE_ROLE|SHIPROCKET|RAZORPAY_(KEY_)?SECRET|WEBHOOK_SECRET/i.test(key)) {
    errors.push(
      `${key} is a NEXT_PUBLIC_* variable holding a server-only secret.\n` +
        `    Next.js inlines every NEXT_PUBLIC_* value into the browser bundle.\n` +
        `    Rename it without the NEXT_PUBLIC_ prefix and read it server-side only.`,
    );
    continue;
  }

  // Catch a secret pasted into an otherwise innocent public var.
  const v = String(value ?? "");
  if (/^mgd_live_/.test(v)) {
    errors.push(
      `${key} contains what looks like a MyGymDesk API key (mgd_live_…).\n` +
        `    That key grants write access to the gym's CRM and must never reach the browser.`,
    );
  }
  if (/^sb_secret_|service_role/.test(v)) {
    errors.push(
      `${key} contains what looks like a Supabase service-role key.\n` +
        `    That key bypasses RLS entirely and must never reach the browser.`,
    );
  }
  if (!PUBLIC_ALLOWLIST.has(key)) {
    warnings.push(
      `${key} is exposed to the browser. Confirm that is intended.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Report
// ---------------------------------------------------------------------------
for (const warning of warnings) {
  console.warn(`⚠ ${warning}`);
}

if (errors.length > 0) {
  console.error(`\n✗ Environment check failed (${errors.length} problem(s)):\n`);
  for (const error of errors) console.error(`  • ${error}\n`);
  process.exit(1);
}

const configured = supabaseUrl
  ? `Supabase host ${new URL(supabaseUrl).host}`
  : "Supabase not configured (seed fallback in use)";
console.log(`✓ Environment check passed — ${configured}.`);
