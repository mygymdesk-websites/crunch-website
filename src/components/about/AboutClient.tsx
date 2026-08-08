"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { TRAINERS } from "@/lib/fixtures/site-content";

/**
 * Coach cards on the About page.
 *
 * Each coach's gym is stored as a location SLUG and resolved to a display name
 * from `site_settings` here — so a rename in the admin panel propagates
 * without touching the fixture.
 */
export function AboutTrainers() {
  const { locations } = useLocation();

  const nameFor = (slug: string) =>
    locations.find((l) => l.slug === slug)?.short_name ?? "";

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[22px]">
      {TRAINERS.map((trainer, index) => (
        <div
          key={trainer.name}
          className="rounded-[16px] border border-line bg-surface p-6 text-center transition-[transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-accent"
        >
          <div
            className={`mx-auto mb-4 aspect-square w-[min(170px,54vw)] overflow-hidden rounded-full border-[3px] p-[5px] ${
              index === 0 ? "border-accent" : "border-line"
            }`}
          >
            <CoverImage
              src={trainer.image}
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
          <div className="mt-1 text-[13px] text-muted">
            {trainer.specialism}
          </div>
          <div className="mt-2.5 border-t border-line pt-3 text-[11px] uppercase tracking-[.1em] text-muted">
            {nameFor(trainer.locationSlug)}
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
