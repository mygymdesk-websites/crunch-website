import Link from "next/link";

import { formatPhone } from "@/lib/format";
import { LEGAL, NAV_LINKS, POLICY_LINKS } from "@/lib/site";
import { addressLines } from "@/lib/location-format";
import type { LocationSocials, SiteLocation } from "@/lib/supabase/types";

/**
 * Site footer.
 *
 * The location columns are generated from `site_settings` — two today, three
 * the day Faridkot is inserted, with no edit here. The grid is
 * `auto-fit/minmax(240px)` so the extra column simply flows.
 */
export function Footer({
  locations,
  currentLocation,
}: {
  locations: SiteLocation[];
  /** The visitor's selected gym — its GSTIN is the one that applies to them. */
  currentLocation?: SiteLocation;
}) {
  // Brand channels come from the default location: they are the company's
  // handles, not a per-gym thing, and this keeps the footer server-rendered.
  const brand = locations.find((l) => l.is_default) ?? locations[0];

  // GST registration is state-wise, so the number shown is the selected
  // branch's. Blank until the client supplies a real one — the line simply
  // isn't rendered rather than showing a placeholder tax number.
  const gstin = (currentLocation ?? brand)?.gstin?.trim();

  return (
    <footer className="mt-[76px] border-t border-line bg-surface2">
      <div className="mx-auto grid w-full max-w-content grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[34px] px-5 pb-7 pt-14">
        <div>
          <div className="mb-3.5 flex items-center gap-[9px]">
            <span
              aria-hidden="true"
              className="block h-[22px] w-[22px] skew-x-[-12deg] bg-accent"
            />
            <span className="font-display text-[20px] font-semibold uppercase tracking-[.06em]">
              Crunch<span className="text-accent">.</span>
            </span>
          </div>
          <p className="m-0 mb-4 max-w-[32ch] text-[13px] leading-[1.65] text-muted">
            {LEGAL.disclaimer}
          </p>
          <SocialRow socials={brand?.socials} />
        </div>

        {locations.map((location) => (
          <div key={location.slug}>
            <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[.14em] text-accent">
              {location.short_name}
            </div>
            <address className="m-0 text-[13px] not-italic leading-[1.7] text-muted">
              {addressLines(location).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <a href={`tel:${location.phone}`} className="block text-muted">
                {formatPhone(location.phone)}
              </a>
              <a href={`mailto:${location.email}`} className="block text-muted">
                {location.email}
              </a>
              <span className="block">{location.hours_summary}</span>
            </address>
          </div>
        ))}

        <div>
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[.14em] text-accent">
            Company
          </div>
          <div className="grid gap-[9px] text-[13px]">
            {NAV_LINKS.filter((l) => l.href !== "/").map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[.14em] text-accent">
            Policies
          </div>
          <div className="grid gap-[9px] text-[13px]">
            {POLICY_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-content flex-wrap justify-between gap-3 border-t border-line px-5 pb-10 pt-[18px] text-[12px] text-muted">
        <span>
          © {new Date().getFullYear()} Crunch Fitness.
          {gstin ? ` GST-registered · GSTIN ${gstin}` : ""}
        </span>
        <span>{LEGAL.paymentsLine}</span>
      </div>
    </footer>
  );
}

/**
 * IG / FB / WA circles — two-letter text marks, per the design system's
 * "no icon font, no hand-drawn SVGs" rule.
 *
 * A channel with no URL yet renders as a non-interactive circle rather than a
 * dead `href="#"`, which would scroll the visitor to the top of the page.
 */
function SocialRow({ socials }: { socials?: LocationSocials }) {
  const channels: Array<{ key: string; label: string; href?: string | null; title: string }> = [
    { key: "ig", label: "IG", href: socials?.instagram, title: "Instagram" },
    { key: "fb", label: "FB", href: socials?.facebook, title: "Facebook" },
    { key: "wa", label: "WA", href: socials?.whatsapp, title: "WhatsApp" },
  ];

  const shell =
    "grid h-[38px] w-[38px] place-items-center rounded-full border border-line text-[12px] font-semibold";

  return (
    <div className="flex gap-2.5">
      {channels.map((channel) =>
        channel.href ? (
          <a
            key={channel.key}
            href={channel.href}
            title={channel.title}
            aria-label={channel.title}
            target="_blank"
            rel="noreferrer noopener"
            className={`${shell} transition-colors hover:border-accent`}
          >
            {channel.label}
          </a>
        ) : (
          <span
            key={channel.key}
            title={`${channel.title} — not set up yet`}
            aria-hidden="true"
            className={`${shell} text-muted opacity-70`}
          >
            {channel.label}
          </span>
        ),
      )}
    </div>
  );
}
