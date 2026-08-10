"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import type { Trainer } from "@/lib/trainers";

/**
 * Coach cards on the About page.
 *
 * Rows come from the `trainers` table, and the branch is resolved to a display
 * name from `site_settings` here — so a rename in the admin panel propagates
 * without touching anything else.
 */
export function AboutTrainers({ trainers }: { trainers: Trainer[] }) {
  const { locations } = useLocation();

  const nameFor = (id: string | null) =>
    id ? (locations.find((l) => l.id === id)?.short_name ?? "") : "All branches";

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[22px]">
      {trainers.map((trainer, index) => (
        <div
          key={trainer.id}
          className="rounded-[16px] border border-line bg-surface p-6 text-center transition-[transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-accent"
        >
          <div
            className={`mx-auto mb-4 aspect-square w-[min(170px,54vw)] overflow-hidden rounded-full border-[3px] p-[5px] ${
              index === 0 ? "border-accent" : "border-line"
            }`}
          >
            <CoverImage
              src={trainer.image_url}
              alt={trainer.name}
              placeholderLabel={trainer.name.toLowerCase()}
              className="overflow-hidden rounded-full"
              imgClassName="rounded-full"
              objectPosition="74% 30%"
            />
          </div>
          <div className="font-display text-[19px] font-semibold uppercase">
            {trainer.name}
          </div>
          {trainer.specialism ? (
            <div className="mt-1 text-[13px] text-muted">
              {trainer.specialism}
            </div>
          ) : null}
          <div className="mt-2.5 border-t border-line pt-3 text-[11px] uppercase tracking-[.1em] text-muted">
            {nameFor(trainer.location_id)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AboutCta() {
  const { openTrial } = useTrialModal();
  return (
    <Button size="lg" onClick={() => openTrial()} className="hover:-translate-y-0.5">
      Book Free Trial
    </Button>
  );
}
