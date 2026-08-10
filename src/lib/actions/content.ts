"use server";

import { revalidatePath, updateTag } from "next/cache";

import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import { SITE_CONTENT_TAG, type ImageSlot } from "@/lib/trainers";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";

/**
 * Admin writes for trainers and imagery.
 *
 * Row writes run as the signed-in admin, so RLS re-checks `is_admin()`
 * independently of the gate above. Uploads go through the service role because
 * storage credentials must never reach a browser — the file arrives here as
 * form data and leaves as a public URL.
 */

export type ContentResult = { ok: true; url?: string } | { ok: false; message: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function requireEditor() {
  const gate = await getAdminGate();
  if (gate.status !== "ok") return "You are not signed in as an admin.";
  if (!canEditSettings(gate.admin)) return "Your role is read-only.";
  return null;
}

function done() {
  // The tag drops the cross-request data cache; the paths drop the rendered
  // pages. Both, or an admin sees their own save on the render after next.
  updateTag(SITE_CONTENT_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/about");
  revalidatePath("/admin/content");
}

/** Uploads an image and returns its public URL. */
export async function uploadImage(formData: FormData): Promise<ContentResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, message: denied };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image first." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, message: "Use a JPEG, PNG, WebP or AVIF image." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "That image is over 5 MB. Please compress it." };
  }

  const service = getServiceSupabase();
  if (!service) return { ok: false, message: "Storage is not configured." };

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  // Content-addressed enough to avoid collisions without leaking the original
  // filename, which is often someone's desktop path.
  const key = `${crypto.randomUUID()}.${ext}`;

  const { error } = await service.storage
    .from("site-media")
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, message: `Upload failed: ${error.message}` };

  const { data } = service.storage.from("site-media").getPublicUrl(key);
  return { ok: true, url: data.publicUrl };
}

/** Points a site-wide image slot at a URL. */
export async function setSiteImage(
  slot: ImageSlot,
  url: string | null,
  alt: string | null,
): Promise<ContentResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, message: denied };

  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { error } = await supabase
    .from("site_images")
    .update({ url: url || null, alt: alt?.trim() || null })
    .eq("slot", slot);

  if (error) return { ok: false, message: `Could not save: ${error.message}` };
  done();
  return { ok: true };
}

export interface TrainerInput {
  id?: string;
  name: string;
  role: string | null;
  specialism: string | null;
  locationId: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isPublished: boolean;
}

export async function saveTrainer(input: TrainerInput): Promise<ContentResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, message: denied };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, message: "Enter the coach's name." };

  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const row = {
    name,
    role: input.role?.trim() || null,
    specialism: input.specialism?.trim() || null,
    location_id: input.locationId || null,
    image_url: input.imageUrl || null,
    display_order: Number.isFinite(input.displayOrder) ? input.displayOrder : 0,
    is_published: input.isPublished,
  };

  const { error } = input.id
    ? await supabase.from("trainers").update(row).eq("id", input.id)
    : await supabase.from("trainers").insert(row);

  if (error) return { ok: false, message: `Could not save: ${error.message}` };
  done();
  return { ok: true };
}

export async function deleteTrainer(id: string): Promise<ContentResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, message: denied };

  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { error } = await supabase.from("trainers").delete().eq("id", id);
  if (error) return { ok: false, message: `Could not delete: ${error.message}` };
  done();
  return { ok: true };
}
