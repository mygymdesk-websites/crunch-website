"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { CoverImage } from "@/components/ui/CoverImage";
import { Badge, Container, Eyebrow, Heading } from "@/components/ui/Primitives";
import { formatPhone } from "@/lib/format";
import { LOCATION_IMAGES } from "@/lib/fixtures/site-content";
import { formatAddress } from "@/lib/location-format";

/**
 * "Pick your home floor" — one card per location, straight from
 * `site_settings`. Selecting a card sets the site-wide location, which the
 * timetable, shop stock and contact details all follow.
 */
export function LocationPicker() {
  const { locations, location, setLocationSlug, isMultiLocation } =
    useLocation();

  if (!isMultiLocation) return null;

  return (
    <Container className="reveal pt-[72px]">
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow className="mb-2.5">
            {locations.length === 2 ? "Two gyms" : `${locations.length} gyms`}
          </Eyebrow>
          <Heading>Pick your home floor</Heading>
        </div>
        <p className="m-0 max-w-[40ch] text-[14px] text-muted">
          Your choice sticks across the site — classes, timetable, shop stock
          and contact details all follow it.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[18px]">
        {locations.map((option) => {
          const selected = option.slug === location.slug;
          return (
            <button
              key={option.slug}
              type="button"
              onClick={() => setLocationSlug(option.slug)}
              aria-pressed={selected}
              className={`cursor-pointer overflow-hidden rounded-card border bg-surface p-0 text-left text-text transition-[transform,border-color] duration-300 hover:-translate-y-[3px] ${
                selected ? "border-accent" : "border-line"
              }`}
            >
              <div className="h-[200px] overflow-hidden">
                <CoverImage
                  src={LOCATION_IMAGES[option.slug]}
                  alt={`${option.short_name} gym floor`}
                  placeholderLabel={`gym floor — ${option.short_name.toLowerCase()}`}
                />
              </div>
              <div className="p-[22px]">
                <div className="flex items-center justify-between gap-3">
                  <Heading as="h3" size="card" className="!text-[22px]">
                    {option.short_name}
                  </Heading>
                  <Badge tone={selected ? "accent" : "muted"}>
                    {selected ? "Selected" : "Select"}
                  </Badge>
                </div>
                <p className="mb-3.5 mt-2.5 text-[14px] leading-[1.6] text-muted">
                  {formatAddress(option)}
                </p>
                <div className="flex gap-[18px] text-[13px] font-semibold">
                  <span>{formatPhone(option.phone)}</span>
                  <span className="text-muted">
                    {option.hours_summary.split("·").at(-1)?.trim()}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Container>
  );
}
