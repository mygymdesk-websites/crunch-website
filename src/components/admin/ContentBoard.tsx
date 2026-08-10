"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { CoverImage } from "@/components/ui/CoverImage";
import {
  deleteTrainer,
  saveTrainer,
  setSiteImage,
  uploadImage,
} from "@/lib/actions/content";
import type { ImageSlot } from "@/lib/trainers";

interface TrainerRow {
  id: string;
  name: string;
  role: string | null;
  specialism: string | null;
  location_id: string | null;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
}

interface Draft {
  id?: string;
  name: string;
  role: string;
  specialism: string;
  locationId: string;
  imageUrl: string;
  displayOrder: number;
  isPublished: boolean;
}

const BLANK: Draft = {
  name: "",
  role: "",
  specialism: "",
  locationId: "",
  imageUrl: "",
  displayOrder: 0,
  isPublished: false,
};

function toDraft(row: TrainerRow): Draft {
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? "",
    specialism: row.specialism ?? "",
    locationId: row.location_id ?? "",
    imageUrl: row.image_url ?? "",
    displayOrder: row.display_order,
    isPublished: row.is_published,
  };
}

const SLOT_LABEL: Record<string, string> = {
  home_hero: "Homepage hero",
  about_hero: "About page hero",
};

export function ContentBoard({
  trainers,
  images,
  locations,
  canEdit,
}: {
  trainers: TrainerRow[];
  images: Array<{ slot: string; url: string | null; alt: string | null }>;
  locations: Array<{ id: string; name: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setMessage(result.message ?? "That didn't work.");
      else {
        setDraft(null);
        router.refresh();
      }
    });
  }

  /** Uploads, then hands the resulting public URL to `onUrl`. */
  async function upload(file: File, onUrl: (url: string) => void) {
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    const result = await uploadImage(form);
    if (!result.ok) setMessage(result.message);
    else if (result.url) onUrl(result.url);
  }

  return (
    <div className="grid gap-10">
      {message ? (
        <p className="m-0 rounded-field border border-accent bg-accent-soft p-3 text-[13px]" role="alert">
          {message}
        </p>
      ) : null}

      {/* ------------------------------------------------------------ images */}
      <section>
        <h2 className="mb-1 font-display text-[18px] font-semibold uppercase">
          Photography
        </h2>
        <p className="m-0 mb-4 max-w-[62ch] text-[13px] leading-[1.6] text-muted">
          Each gym&rsquo;s own hero and card photo live on{" "}
          <b className="text-text">Site settings</b>. These two are site-wide.
          Empty renders the striped placeholder, which is the honest default —
          better a placeholder than a stock photo of someone else&rsquo;s gym.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {images.map((image) => (
            <ImageSlotCard
              key={image.slot}
              slot={image.slot as ImageSlot}
              url={image.url}
              alt={image.alt}
              canEdit={canEdit}
              pending={pending}
              onUpload={upload}
              onSave={(url, altText) =>
                run(() => setSiteImage(image.slot as ImageSlot, url, altText))
              }
            />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- trainers */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 font-display text-[18px] font-semibold uppercase">
              Coaches ({trainers.length})
            </h2>
            <p className="m-0 mt-1 max-w-[62ch] text-[13px] leading-[1.6] text-muted">
              Shown on the homepage and About page. Unpublished rows stay
              invisible to visitors.
            </p>
          </div>
          {canEdit ? (
            <Button size="sm" onClick={() => setDraft({ ...BLANK })}>
              Add a coach
            </Button>
          ) : null}
        </div>

        {draft ? (
          <TrainerForm
            draft={draft}
            locations={locations}
            pending={pending}
            onChange={setDraft}
            onUpload={upload}
            onCancel={() => setDraft(null)}
            onSave={() =>
              run(() =>
                saveTrainer({
                  id: draft.id,
                  name: draft.name,
                  role: draft.role,
                  specialism: draft.specialism,
                  locationId: draft.locationId || null,
                  imageUrl: draft.imageUrl || null,
                  displayOrder: draft.displayOrder,
                  isPublished: draft.isPublished,
                }),
              )
            }
          />
        ) : null}

        {trainers.length === 0 && !draft ? (
          <p className="m-0 rounded-card border border-dashed border-line px-5 py-10 text-center text-[13px] text-muted">
            No coaches yet. The section stays hidden on the public site until
            you publish one.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-line">
            {trainers.map((trainer) => (
              <div
                key={trainer.id}
                className="flex flex-wrap items-center gap-3 border-b border-line bg-bg px-4 py-3 last:border-b-0"
              >
                <span className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full">
                  <CoverImage
                    src={trainer.image_url}
                    alt={trainer.name}
                    placeholderLabel=""
                  />
                </span>
                <span className="min-w-0 flex-[1_1_200px]">
                  <span className="block text-[14px] font-bold">{trainer.name}</span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {trainer.role || "No title set"}
                    {trainer.location_id
                      ? ` · ${locations.find((l) => l.id === trainer.location_id)?.name ?? "—"}`
                      : " · All branches"}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-pill px-3 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${
                    trainer.is_published
                      ? "bg-accent text-accent-ink"
                      : "border border-line text-muted"
                  }`}
                >
                  {trainer.is_published ? "Live" : "Hidden"}
                </span>
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDraft(toDraft(trainer))}
                      className="shrink-0 cursor-pointer rounded-pill border border-line bg-transparent px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deleteTrainer(trainer.id))}
                      className="shrink-0 cursor-pointer border-0 bg-transparent text-[11px] uppercase tracking-[.08em] text-muted underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ImageSlotCard({
  slot,
  url,
  alt,
  canEdit,
  pending,
  onUpload,
  onSave,
}: {
  slot: ImageSlot;
  url: string | null;
  alt: string | null;
  canEdit: boolean;
  pending: boolean;
  onUpload: (file: File, onUrl: (url: string) => void) => Promise<void>;
  onSave: (url: string | null, alt: string | null) => void;
}) {
  const [value, setValue] = useState(url ?? "");
  const [altText, setAltText] = useState(alt ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[.1em] text-muted">
        {SLOT_LABEL[slot] ?? slot}
      </div>

      <div className="mb-3 h-[150px] overflow-hidden rounded-field">
        <CoverImage src={value || null} alt={altText} placeholderLabel="no image" />
      </div>

      {canEdit ? (
        <div className="grid gap-2.5">
          <label className="cursor-pointer rounded-pill border border-line px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[.08em]">
            {busy ? "Uploading…" : "Upload an image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                await onUpload(file, setValue);
                setBusy(false);
              }}
            />
          </label>
          <Input
            id={`${slot}-alt`}
            label="Describe the image (for screen readers)"
            placeholder="e.g. Members training on the main floor"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || busy}
              onClick={() => onSave(value || null, altText)}
            >
              Save
            </Button>
            {value ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending || busy}
                onClick={() => {
                  setValue("");
                  onSave(null, null);
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TrainerForm({
  draft,
  locations,
  pending,
  onChange,
  onUpload,
  onCancel,
  onSave,
}: {
  draft: Draft;
  locations: Array<{ id: string; name: string }>;
  pending: boolean;
  onChange: (draft: Draft) => void;
  onUpload: (file: File, onUrl: (url: string) => void) => Promise<void>;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="mb-4 rounded-card border border-accent bg-surface p-5">
      <div className="mb-4 font-display text-[16px] font-semibold uppercase">
        {draft.id ? "Edit coach" : "New coach"}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          id="t-name"
          label="Name"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
        <Input
          id="t-role"
          label="Job title"
          placeholder="e.g. Head Coach"
          hint="Leave blank rather than guess — a wrong title is worse than none."
          value={draft.role}
          onChange={(e) => set("role", e.target.value)}
        />
        <Input
          id="t-spec"
          label="Specialism"
          placeholder="e.g. Strength & conditioning"
          value={draft.specialism}
          onChange={(e) => set("specialism", e.target.value)}
        />
        <Select
          id="t-loc"
          label="Branch"
          value={draft.locationId}
          onChange={(e) => set("locationId", e.target.value)}
        >
          <option value="">All branches</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Input
          id="t-order"
          label="Display order"
          type="number"
          value={String(draft.displayOrder)}
          onChange={(e) => set("displayOrder", Number(e.target.value) || 0)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-full">
          <CoverImage src={draft.imageUrl || null} alt="" placeholderLabel="" />
        </span>
        <label className="cursor-pointer rounded-pill border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em]">
          {busy ? "Uploading…" : "Upload a photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              await onUpload(file, (url) => set("imageUrl", url));
              setBusy(false);
            }}
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-[12px] font-bold uppercase tracking-[.08em]">
          <input
            type="checkbox"
            checked={draft.isPublished}
            onChange={(e) => set("isPublished", e.target.checked)}
          />
          Show on the website
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <Button disabled={pending || busy} onClick={onSave}>
          Save coach
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
