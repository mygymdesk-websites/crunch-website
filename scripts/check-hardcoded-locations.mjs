#!/usr/bin/env node
/**
 * Acceptance check from the Phase 1 brief:
 *
 *   "grep the codebase, zero hardcoded location names outside seeds"
 *
 * Adding a third location (Faridkot) must be a data change — insert a row,
 * point it at an MGD branch — not a code change. This script fails the build
 * if a location name, address, phone or email has leaked into source.
 *
 *   npm run check:locations
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** Everything a location owns, derived from the seed itself. */
const seed = JSON.parse(
  readFileSync(join(root, "supabase", "seed", "locations.seed.json"), "utf8"),
);

const needles = new Set();
for (const loc of seed.locations) {
  for (const field of [
    "name",
    "short_name",
    "address_line1",
    "address_line2",
    "postal_code",
    "phone",
    "email",
    "hours_summary",
    "transit_note",
  ]) {
    const value = loc[field];
    if (typeof value === "string" && value.trim().length >= 5) {
      needles.add(value.trim());
    }
  }
  // Phone digits also leak in prettified form (+91 98110 24680).
  const digits = String(loc.phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) needles.add(digits.slice(-10));
}

/** Directories that legitimately contain location data. */
const ALLOWED = [
  join("supabase", "seed"),
  join("supabase", "seed.sql"),
  join("scripts", "check-hardcoded-locations.mjs"),
  join("scripts", "generate-seed-sql.mjs"),
  // Reference copy of the Claude Design export, kept for provenance. Not built.
  "design-export",
  "Crunch_Fitness_PRD_v1.md",
  "HANDOFF.md",
  "README.md",
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "dist",
  ".vercel",
]);

const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|css|json|md|mdx|sql)$/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (SCAN_EXT.test(entry)) {
      yield full;
    }
  }
}

/**
 * Blank out comments before matching.
 *
 * The rule being enforced is "no location data in CODE" — a location named in
 * a comment or a doc example cannot render the wrong gym. Without this, the
 * check punishes explaining yourself, which is the wrong incentive.
 *
 * Replaces comment bodies with spaces rather than deleting them, so reported
 * line numbers still line up with the file.
 */
function stripComments(text, file) {
  const blank = (m) => m.replace(/[^\n]/g, " ");

  let out = text
    // /* … */ and JSX {/* … */}
    .replace(/\/\*[\s\S]*?\*\//g, blank);

  out = file.endsWith(".sql")
    ? out.replace(/--[^\n]*/g, blank)
    : out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));

  return out;
}

const violations = [];

for (const file of walk(root)) {
  const rel = relative(root, file);
  if (ALLOWED.some((a) => rel === a || rel.startsWith(a + sep))) continue;

  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw, file);
  const codeLines = text.split(/\r?\n/);
  const rawLines = raw.split(/\r?\n/);

  for (const needle of needles) {
    if (!text.includes(needle)) continue;
    codeLines.forEach((line, i) => {
      if (line.includes(needle)) {
        violations.push({ rel, line: i + 1, needle, text: rawLines[i].trim() });
      }
    });
  }
}

if (violations.length > 0) {
  console.error(
    `\n✗ Hardcoded location data found in ${violations.length} place(s).\n` +
      `  Locations must come from site_settings. Move these into\n` +
      `  supabase/seed/locations.seed.json and read them via getLocations().\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}  "${v.needle}"`);
    console.error(`    ${v.text.slice(0, 120)}`);
  }
  process.exit(1);
}

console.log(
  `✓ No hardcoded location data outside seeds (checked ${needles.size} strings).`,
);
