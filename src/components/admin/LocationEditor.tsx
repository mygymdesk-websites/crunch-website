"use client";

import { useState, useTransition } from "react";

import { uploadImage } from "@/lib/actions/content";
import { updateLocation } from "@/lib/actions/site-settings";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { Input } from "@/components/ui/Field";
import { Heading } from "@/components/ui/Primitives";
import type { SiteLocationAdmin } from "@/lib/supabase/types";

/**
 * The Site Settings editor: one card per location.
 *
 * `slug` is shown read-only on purpose — enquiry rows, the location cookie and
 * (from Phase 5) order rows all snapshot it, so renaming it in a form would
 * quietly orphan data. Changing a slug is a deliberate migration.
 */
export function LocationEditor({
  location,
  canEdit,
}: {
  location: SiteLocationAdmin;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [hours, setHours] = useState(
    location.hours.length > 0
      ? location.hours
      : [{ label: "Monday – Sunday", value: "" }],
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setResult(null);
    startTransition(async () => {
      setResult(await updateLocation(form));
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[16px] border border-line bg-surface p-6"
    >
      <input type="hidden" name="id" value={location.id} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Heading as="h2" size="card" className="!text-[20px]">
          {location.short_name}
        </Heading>
        <code className="rounded bg-surface2 px-2 py-1 font-mono text-[11px] text-muted">
          /{location.slug}
        </code>
      </div>

      <FieldSet legend="Identity">
        <Input
          id={`${location.id}-name`}
          name="name"
          label="Full name"
          showLabel
          defaultValue={location.name}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-short`}
          name="short_name"
          label="Short name (header pill, chips)"
          showLabel
          defaultValue={location.short_name}
          disabled={!canEdit}
        />
      </FieldSet>

      <FieldSet legend="Address">
        <Input
          id={`${location.id}-l1`}
          name="address_line1"
          label="Address line 1"
          showLabel
          defaultValue={location.address_line1}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-l2`}
          name="address_line2"
          label="Address line 2"
          showLabel
          defaultValue={location.address_line2 ?? ""}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-city`}
          name="city"
          label="City"
          showLabel
          defaultValue={location.city}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-state`}
          name="state"
          label="State"
          showLabel
          defaultValue={location.state}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-pin`}
          name="postal_code"
          label="PIN code"
          showLabel
          defaultValue={location.postal_code}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-transit`}
          name="transit_note"
          label="Transit note"
          showLabel
          defaultValue={location.transit_note ?? ""}
          hint="e.g. 4 min from the nearest metro · parking on site"
          disabled={!canEdit}
        />
      </FieldSet>

      <FieldSet legend="Contact">
        <Input
          id={`${location.id}-phone`}
          name="phone"
          label="Phone (E.164, e.g. +919000000000)"
          showLabel
          defaultValue={location.phone}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-wa`}
          name="whatsapp"
          label="WhatsApp number"
          showLabel
          defaultValue={location.whatsapp ?? ""}
          hint="Leave blank to use the phone number."
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-email`}
          name="email"
          label="Email"
          showLabel
          type="email"
          defaultValue={location.email}
          disabled={!canEdit}
        />
      </FieldSet>

      <FieldSet legend="Hours">
        <Input
          id={`${location.id}-hours-summary`}
          name="hours_summary"
          label="One-line summary (header + footer)"
          showLabel
          defaultValue={location.hours_summary}
          hint="e.g. Mon–Sun · 05:00 – 23:00"
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-closed`}
          name="closed_note"
          label="Closure note"
          showLabel
          defaultValue={location.closed_note ?? ""}
          hint="e.g. Closed on Holi, Diwali and Independence Day."
          disabled={!canEdit}
        />
      </FieldSet>

      <div className="mb-5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
          Per-day breakdown (Contact page)
        </div>
        <div className="grid gap-2.5">
          {hours.map((row, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2.5">
              <Input
                id={`${location.id}-hl-${index}`}
                name="hours_label"
                label={`Day label ${index + 1}`}
                defaultValue={row.label}
                placeholder="Monday – Friday"
                className="min-w-[160px] flex-auto"
                disabled={!canEdit}
              />
              <Input
                id={`${location.id}-hv-${index}`}
                name="hours_value"
                label={`Hours ${index + 1}`}
                defaultValue={row.value}
                placeholder="05:30 – 22:30"
                className="min-w-[140px] flex-auto"
                disabled={!canEdit}
              />
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    setHours((rows) => rows.filter((_, i) => i !== index))
                  }
                  className="mb-1 cursor-pointer rounded-pill border border-line px-3 py-2 text-[11px] font-bold uppercase text-muted hover:border-accent"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {canEdit ? (
          <Button
            variant="outline"
            size="xs"
            className="mt-2.5"
            onClick={() =>
              setHours((rows) => [...rows, { label: "", value: "" }])
            }
          >
            Add a row
          </Button>
        ) : null}
      </div>

      <FieldSet legend="Map & socials">
        <Input
          id={`${location.id}-embed`}
          name="map_embed_url"
          label="Google Maps embed"
          showLabel
          defaultValue={location.map_embed_url ?? ""}
          hint="Paste the whole embed code from Maps → Share → Embed a map, or just its URL — either works. A share link (maps.app.goo.gl) is NOT an embed and belongs in the field below. Blank shows a placeholder."
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-maplink`}
          name="map_link_url"
          label="Directions link"
          showLabel
          defaultValue={location.map_link_url ?? ""}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-ig`}
          name="social_instagram"
          label="Instagram URL"
          showLabel
          defaultValue={location.socials?.instagram ?? ""}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-fb`}
          name="social_facebook"
          label="Facebook URL"
          showLabel
          defaultValue={location.socials?.facebook ?? ""}
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-wal`}
          name="social_whatsapp"
          label="WhatsApp link"
          showLabel
          defaultValue={location.socials?.whatsapp ?? ""}
          hint="Blank builds a wa.me link from the WhatsApp number."
          disabled={!canEdit}
        />
      </FieldSet>

      <FieldSet legend="Photography">
        <ImageField
          name="card_image_url"
          label="Card photo"
          hint="The thumbnail on the location picker. Blank renders the striped placeholder."
          initial={location.card_image_url}
          canEdit={canEdit}
        />
        <ImageField
          name="hero_image_url"
          label="Branch hero"
          hint="Used where this gym has a page of its own."
          initial={location.hero_image_url}
          canEdit={canEdit}
        />
      </FieldSet>

      <FieldSet legend="MyGymDesk & display">
        <Input
          id={`${location.id}-mgd`}
          name="mgd_location_id"
          label="MyGymDesk branch UUID"
          showLabel
          defaultValue={location.mgd_location_id ?? ""}
          hint="From a locationId in an unfiltered Website API response. Required before this gym's classes, plans and stock can be filtered."
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-gstin`}
          name="gstin"
          label="GSTIN (this branch)"
          showLabel
          defaultValue={location.gstin ?? ""}
          hint="GST registration is state-wise, so each branch has its own. Leave blank and the footer omits the line entirely — it never shows a placeholder."
          disabled={!canEdit}
        />
        <Input
          id={`${location.id}-order`}
          name="display_order"
          label="Display order"
          showLabel
          type="number"
          defaultValue={String(location.display_order)}
          disabled={!canEdit}
        />
      </FieldSet>

      <label className="mb-5 flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={location.is_active}
          disabled={!canEdit}
          className="h-4 w-4 accent-accent"
        />
        Active — shown in the location selector and on the site
      </label>

      {result ? (
        <p
          role="status"
          className={`m-0 mb-3.5 text-[13px] ${result.ok ? "text-accent" : "text-accent"}`}
        >
          {result.message}
        </p>
      ) : null}

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      ) : (
        <p className="m-0 text-[13px] text-muted">
          Your role is read-only. Ask an owner or manager to make changes.
        </p>
      )}
    </form>
  );
}

function FieldSet({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mb-5 border-0 p-0">
      <legend className="mb-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
        {legend}
      </legend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {children}
      </div>
    </fieldset>
  );
}

/**
 * An image picker that still saves through the surrounding form.
 *
 * Upload happens immediately — the file goes to storage and comes back as a
 * public URL — but the URL is then held in a hidden input, so the branch is
 * only actually repointed when the admin saves the card. That keeps one Save
 * button meaning one thing, rather than some fields committing on their own.
 */
function ImageField({
  name,
  label,
  hint,
  initial,
  canEdit,
}: {
  name: string;
  label: string;
  hint: string;
  initial: string | null;
  canEdit: boolean;
}) {
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={url} />
      <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">
        {label}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="h-[64px] w-[96px] shrink-0 overflow-hidden rounded-field">
          <CoverImage src={url || null} alt="" placeholderLabel="no photo" />
        </span>

        {canEdit ? (
          <>
            <label className="cursor-pointer rounded-pill border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em]">
              {busy ? "Uploading…" : url ? "Replace" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError(null);
                  const data = new FormData();
                  data.set("file", file);
                  const result = await uploadImage(data);
                  if (!result.ok) setError(result.message);
                  else if (result.url) setUrl(result.url);
                  setBusy(false);
                }}
              />
            </label>
            {url ? (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="cursor-pointer border-0 bg-transparent text-[11px] uppercase tracking-[.08em] text-muted underline"
              >
                Remove
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      <p className="m-0 text-[12px] leading-[1.5] text-muted">{error ?? hint}</p>
    </div>
  );
}
