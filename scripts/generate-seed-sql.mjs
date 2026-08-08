#!/usr/bin/env node
/**
 * Generates supabase/seed.sql from supabase/seed/locations.seed.json.
 *
 * Location data has exactly one source of truth. Rather than keep a JSON copy
 * and a SQL copy in sync by hand (they would drift the first time someone
 * fixed a phone number), the SQL is generated and committed.
 *
 *   npm run seed:generate
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const seedPath = join(root, "supabase", "seed", "locations.seed.json");
const outPath = join(root, "supabase", "seed.sql");

/** Quote a value as a SQL literal. */
function lit(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Quote a JS object/array as a jsonb literal. */
function jsonb(value) {
  return `${lit(JSON.stringify(value ?? null))}::jsonb`;
}

const COLUMNS = [
  "slug",
  "name",
  "short_name",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "postal_code",
  "transit_note",
  "phone",
  "whatsapp",
  "email",
  "hours_summary",
  "hours",
  "closed_note",
  "map_embed_url",
  "map_link_url",
  "latitude",
  "longitude",
  "socials",
  "mgd_location_id",
  "gstin",
  "is_active",
  "is_default",
  "display_order",
  "hero_image_url",
];

const JSON_COLUMNS = new Set(["hours", "socials"]);
const UUID_COLUMNS = new Set(["mgd_location_id"]);

const { locations } = JSON.parse(readFileSync(seedPath, "utf8"));

if (!Array.isArray(locations) || locations.length === 0) {
  throw new Error("locations.seed.json has no locations");
}

const defaults = locations.filter((l) => l.is_default);
if (defaults.length !== 1) {
  throw new Error(
    `exactly one location must have is_default: true (found ${defaults.length})`,
  );
}

const slugs = new Set(locations.map((l) => l.slug));
if (slugs.size !== locations.length) {
  throw new Error("duplicate location slug in locations.seed.json");
}

const rows = locations
  .map((loc) => {
    const values = COLUMNS.map((col) => {
      const raw = loc[col];
      if (JSON_COLUMNS.has(col)) return jsonb(raw ?? (col === "hours" ? [] : {}));
      if (UUID_COLUMNS.has(col)) return raw ? `${lit(raw)}::uuid` : "null";
      return lit(raw ?? null);
    });
    return `  (\n    ${values.join(",\n    ")}\n  )`;
  })
  .join(",\n");

// `is_default` carries a partial unique index, so a re-seed that flips the
// default would collide mid-statement. Clearing it first makes the seed
// re-runnable.
const sql = `-- ============================================================================
-- GENERATED FILE — DO NOT EDIT BY HAND.
--
-- Source: supabase/seed/locations.seed.json
-- Regenerate: npm run seed:generate
--
-- Idempotent: safe to run against a database that already has these rows.
-- ============================================================================

begin;

-- Drop the default flag first: it is backed by a partial unique index, so
-- moving the default between locations would otherwise collide mid-upsert.
update public.site_settings set is_default = false where is_default;

insert into public.site_settings (
${COLUMNS.map((c) => `  ${c}`).join(",\n")}
) values
${rows}
on conflict (slug) do update set
${COLUMNS.filter((c) => c !== "slug")
  .map((c) => `  ${c} = excluded.${c}`)
  .join(",\n")},
  updated_at = now();

commit;

-- ----------------------------------------------------------------------------
-- Admin bootstrap (run once, by hand, after creating the first auth user).
--
-- An admin_users row is what grants /admin access — an auth account alone is
-- not enough, and there is no INSERT policy for \`authenticated\`, so this has
-- to run with the service role (SQL editor or a server-side script).
--
--   insert into public.admin_users (id, email, full_name, role)
--   select id, email, 'Full Name', 'owner'
--   from auth.users
--   where email = 'admin@crunchfitness.in'
--   on conflict (id) do update
--     set role = excluded.role, is_active = true;
-- ----------------------------------------------------------------------------
`;

writeFileSync(outPath, sql, "utf8");
console.log(
  `seed.sql written: ${locations.length} location(s) — ${locations
    .map((l) => l.slug)
    .join(", ")}`,
);
