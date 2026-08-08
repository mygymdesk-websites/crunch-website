#!/usr/bin/env node
/**
 * Acceptance check from the Phase 1 brief:
 *
 *   "zero MGD key references outside server code"
 *
 * MGD_API_KEY grants write access to the gym's CRM and booking system. It must
 * never reach the browser bundle. Two ways that happens, both caught here:
 *
 *   1. the key is read in a file carrying the "use client" directive;
 *   2. someone creates a NEXT_PUBLIC_MGD_* variable, which Next inlines into
 *      client JS by definition.
 *
 *   npm run check:mgd-key
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const srcDir = join(root, "src");

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "dist"]);
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs)$/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (SCAN_EXT.test(entry)) yield full;
  }
}

const violations = [];

for (const file of walk(srcDir)) {
  const rel = relative(root, file);
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  const isClient = /^\s*["']use client["']\s*;?/m.test(text.slice(0, 400));

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;

    if (/NEXT_PUBLIC_MGD/i.test(line)) {
      violations.push({
        at,
        why: "NEXT_PUBLIC_MGD_* is inlined into client JS by Next.js",
        line: line.trim(),
      });
    }

    if (isClient && /MGD_API_KEY|x-mgd-api-key/i.test(line)) {
      violations.push({
        at,
        why: 'MGD credential referenced in a "use client" module',
        line: line.trim(),
      });
    }
  });
}

if (violations.length > 0) {
  console.error(`\n✗ MGD key isolation broken in ${violations.length} place(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.at}  — ${v.why}`);
    console.error(`    ${v.line.slice(0, 120)}`);
  }
  process.exit(1);
}

console.log("✓ MGD API key is referenced only from server-side modules.");
