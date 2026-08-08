"use server";

import { revalidatePath, updateTag } from "next/cache";

import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import { SITE_SETTINGS_TAG } from "@/lib/site-settings";
import { getServerSupabase } from "@/lib/supabase/server";
import type { OpeningHoursRow } from "@/lib/supabase/types";

/**
 * Site-settings updates.
 *
 * Deliberately uses the CALLER'S session, not the service role. The write
 * therefore has to satisfy the `site_settings_admin_write` RLS policy, which
 * calls `is_admin()` — so the database enforces the gate independently of this
 * function. A bug here cannot become a privilege escalation.
 */

export interface UpdateLocationResult {
  ok: boolean;
  message: string;
}

function text(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parse the repeating "label / value" hours rows out of the form. */
function hoursFrom(form: FormData): OpeningHoursRow[] {
  const labels = form.getAll("hours_label");
  const values = form.getAll("hours_value");

  return labels
    .map((label, index) => ({
      label: String(label).trim(),
      value: String(values[index] ?? "").trim(),
    }))
    .filter((row) => row.label.length > 0 && row.value.length > 0);
}

export async function updateLocation(
  form: FormData,
): Promise<UpdateLocationResult> {
  const gate = await getAdminGate();
  if (gate.status !== "ok") {
    return { ok: false, message: "You are not signed in as an admin." };
  }
  if (!canEditSettings(gate.admin)) {
    return {
      ok: false,
      message: "Your role is read-only. Ask an owner or manager to make this change.",
    };
  }

  const id = text(form, "id");
  if (!id) return { ok: false, message: "Missing location id." };

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  // `slug` is intentionally absent: it is referenced by enquiry snapshots,
  // cookies and (later) order rows, so renaming it silently orphans data.
  // Changing a slug is a deliberate migration, not a form field.
  const patch = {
    name: text(form, "name"),
    short_name: text(form, "short_name"),
    address_line1: text(form, "address_line1"),
    address_line2: text(form, "address_line2"),
    city: text(form, "city"),
    state: text(form, "state"),
    postal_code: text(form, "postal_code"),
    transit_note: text(form, "transit_note"),
    phone: text(form, "phone"),
    whatsapp: text(form, "whatsapp"),
    email: text(form, "email"),
    hours_summary: text(form, "hours_summary"),
    hours: hoursFrom(form),
    closed_note: text(form, "closed_note"),
    map_embed_url: text(form, "map_embed_url"),
    map_link_url: text(form, "map_link_url"),
    socials: {
      instagram: text(form, "social_instagram"),
      facebook: text(form, "social_facebook"),
      whatsapp: text(form, "social_whatsapp"),
    },
    mgd_location_id: text(form, "mgd_location_id"),
    // Uppercased because the CHECK constraint expects the canonical form, and
    // people type GSTINs in lower case. Blank stays NULL so the footer omits
    // the line rather than rendering an empty "GSTIN".
    gstin: text(form, "gstin")?.toUpperCase() ?? null,
    display_order: Number(form.get("display_order") ?? 0) || 0,
    is_active: form.get("is_active") === "on",
  };

  for (const required of [
    "name",
    "short_name",
    "address_line1",
    "city",
    "state",
    "postal_code",
    "phone",
    "email",
    "hours_summary",
  ] as const) {
    if (!patch[required]) {
      return { ok: false, message: `${required.replace(/_/g, " ")} is required.` };
    }
  }

  const { error } = await supabase
    .from("site_settings")
    .update(patch)
    .eq("id", id);

  if (error) {
    // RLS refusing the write surfaces here as a Postgres error rather than a
    // silent no-op, because the policy is on UPDATE not SELECT.
    return { ok: false, message: `Could not save: ${error.message}` };
  }

  // Locations feed the header, footer and every location-aware surface.
  // `updateTag` rather than `revalidateTag`: this is a Server Action, and the
  // admin must see their own save reflected on the very next render, not on the
  // one after. The tag drops the cross-request data cache; the path drops the
  // rendered pages. Both are needed — without the tag the pages would
  // re-render against a cached copy of the old row.
  updateTag(SITE_SETTINGS_TAG);
  revalidatePath("/", "layout");

  return { ok: true, message: "Saved." };
}
