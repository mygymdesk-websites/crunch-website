import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Small repeated pieces of the design system, so the values live in one place:
 * eyebrow labels, section headings, cards, chips, the striped placeholder and
 * the shimmer skeleton.
 */

/** 11px / 700 / .18em / uppercase / accent — sits above every section headline. */
export function Eyebrow({
  children,
  boxed = false,
  className,
}: {
  children: ReactNode;
  /** The pill-on-accent-soft variant used on page heroes. */
  boxed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[11px] font-bold uppercase tracking-[.18em] text-accent",
        boxed
          ? "inline-block rounded-md bg-accent-soft px-[14px] py-[7px]"
          : undefined,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Display headline. `as` keeps the heading level honest per page. */
export function Heading({
  as: Tag = "h2",
  size = "section",
  children,
  className,
  style,
}: {
  as?: "h1" | "h2" | "h3";
  size?: "hero" | "page" | "section" | "sub" | "card";
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const sizes = {
    hero: "text-[clamp(40px,6.4vw,84px)] leading-[1.02]",
    page: "text-[clamp(32px,5vw,64px)] leading-[1.03]",
    section: "text-[clamp(28px,4.2vw,46px)] leading-[1.05]",
    sub: "text-[clamp(22px,3vw,34px)] leading-[1.06]",
    card: "text-[19px] leading-[1.2]",
  } as const;

  return (
    <Tag
      style={style}
      className={cn(
        "m-0 font-display font-semibold uppercase text-text",
        sizes[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** 1320px max width + 20px side padding — the design's content measure. */
export function Container({
  children,
  className,
  id,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "div" | "section";
}) {
  return (
    <Tag id={id} className={cn("mx-auto w-full max-w-content px-5", className)}>
      {children}
    </Tag>
  );
}

/** Surface card: 1px line + surface fill + 14px radius. No shadow. */
export function Card({
  children,
  className,
  featured = false,
  hoverLift = false,
}: {
  children: ReactNode;
  className?: string;
  /** 2px accent border + soft shadow, for the "most popular" card. */
  featured?: boolean;
  hoverLift?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface",
        featured
          ? "border-2 border-accent shadow-featured"
          : "border border-line",
        hoverLift &&
          "transition-[transform,border-color] duration-300 ease-out hover:-translate-y-[3px] hover:border-accent",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Pill filter chip. Accent fill when active. */
export function Chip({
  active,
  children,
  className,
  ...rest
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
} & React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-pill border px-[17px] py-[9px] text-[12px] font-semibold tracking-[.04em] transition-colors duration-200",
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-transparent text-text hover:border-accent",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * The documented stand-in for a missing photo: diagonal --ph1/--ph2 stripes
 * plus a monospace label saying what should be there.
 */
export function StripedPlaceholder({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "striped-placeholder grid h-full w-full place-items-center px-3",
        className,
      )}
      role="img"
      aria-label={label}
    >
      <span className="text-center font-mono text-[10px] uppercase tracking-[.1em] text-muted">
        {label}
      </span>
    </div>
  );
}

/** Shimmering block used by every loading skeleton. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-[shimmer_1.4s_ease-in-out_infinite] bg-surface2", className)}
    />
  );
}

/** Small uppercase status/flag chip that sits over imagery. */
export function Badge({
  children,
  tone = "dark",
  className,
}: {
  children: ReactNode;
  tone?: "dark" | "accent" | "muted" | "light";
  className?: string;
}) {
  const tones = {
    dark: "bg-black/[.66] text-white",
    accent: "bg-accent text-accent-ink",
    muted: "bg-surface2 text-muted",
    light: "bg-white/90 text-[#101013]",
  } as const;

  return (
    <span
      className={cn(
        "inline-block rounded-pill px-[9px] py-[5px] text-[10px] font-bold uppercase tracking-[.1em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Section rhythm: 72–80px between sections, per the design system. */
export function Section({
  children,
  className,
  band,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Alternating surface bands, per the design's section rhythm. */
  band?: "surface" | "surface2" | "accent";
  id?: string;
}) {
  const bands = {
    surface: "bg-surface border-y border-line",
    surface2: "bg-surface2 border-y border-line",
    accent: "bg-accent text-accent-ink",
  } as const;

  return (
    <section id={id} className={cn(band && bands[band], className)}>
      {children}
    </section>
  );
}
