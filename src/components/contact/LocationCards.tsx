"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { Badge, Heading } from "@/components/ui/Primitives";
import { formatPhone } from "@/lib/format";
import { formatAddress, mapEmbedSrc, mapPlaceholderLabel } from "@/lib/location-format";

/**
 * One card per location, straight from `site_settings`.
 *
 * The map is a striped placeholder until a `map_embed_url` is filled in from
 * the admin panel — the design's documented treatment for missing imagery,
 * rather than an empty grey box or a fake screenshot.
 */
export function LocationCards() {
  const { locations, location, setLocationSlug } = useLocation();

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
      {locations.map((entry) => {
        const active = entry.slug === location.slug;
        return (
          <div
            key={entry.slug}
            className={`overflow-hidden rounded-[16px] bg-surface ${
              active ? "border-2 border-accent" : "border border-line"
            }`}
          >
            <div className="relative h-[190px] border-b border-line">
              {mapEmbedSrc(entry.map_embed_url) ? (
                <iframe
                  src={mapEmbedSrc(entry.map_embed_url) ?? undefined}
                  title={`Map of ${entry.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="striped-placeholder grid h-full w-full place-items-center px-5">
                  <span className="text-center font-mono text-[11px] uppercase tracking-[.12em] text-muted">
                    {mapPlaceholderLabel(entry)}
                  </span>
                </div>
              )}
              <span className="absolute left-3 top-3">
                <Badge tone={active ? "accent" : "dark"}>
                  {active ? "Your gym" : "Other location"}
                </Badge>
              </span>
            </div>

            <div className="p-6">
              <Heading as="h3" size="card" className="mb-3 !text-[23px]">
                {entry.short_name}
              </Heading>

              <div className="mb-[18px] grid gap-2.5 text-[14px] leading-[1.6] text-muted">
                <DetailRow mark="◈">{formatAddress(entry)}</DetailRow>
                <DetailRow mark="☎">
                  <a href={`tel:${entry.phone}`} className="text-muted">
                    {formatPhone(entry.phone)}
                  </a>
                </DetailRow>
                <DetailRow mark="✉">
                  <a href={`mailto:${entry.email}`} className="text-muted">
                    {entry.email}
                  </a>
                </DetailRow>
                <DetailRow mark="◷">{entry.hours_summary}</DetailRow>
                {entry.transit_note ? (
                  <DetailRow mark="◉">{entry.transit_note}</DetailRow>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <a
                  href={
                    entry.map_link_url ??
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${entry.name}, ${formatAddress(entry)}`,
                    )}`
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex-auto rounded-pill bg-accent px-[22px] py-[13px] text-center text-[12px] font-bold uppercase tracking-[.08em] text-accent-ink transition-[filter] hover:text-accent-ink hover:brightness-[1.08]"
                >
                  Get directions
                </a>
                <button
                  type="button"
                  onClick={() => setLocationSlug(entry.slug)}
                  disabled={active}
                  className="shrink-0 cursor-pointer rounded-pill border border-line bg-transparent px-[22px] py-[13px] text-[12px] font-bold uppercase tracking-[.08em] text-text transition-colors hover:border-accent disabled:cursor-default disabled:text-muted"
                >
                  {active ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({
  mark,
  children,
}: {
  mark: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span aria-hidden="true" className="shrink-0 text-accent">
        {mark}
      </span>
      <span>{children}</span>
    </div>
  );
}
