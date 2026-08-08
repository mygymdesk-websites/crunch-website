"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useLocation } from "@/components/providers/LocationProvider";
import { cn } from "@/lib/cn";

/**
 * The location selector, in both of its design variants:
 *
 *   - `pill`   — the surface2 pill in the wide header, opening a dropdown card;
 *   - `bar`    — the full-width strip below the header on narrow screens.
 *
 * The list is whatever `site_settings` holds. Nothing here knows how many gyms
 * there are or what they are called: a third row appears in this menu the
 * moment it is inserted.
 */

interface Props {
  variant: "pill" | "bar";
  className?: string;
}

export function LocationMenu({ variant, className }: Props) {
  const { locations, location, setLocationSlug, isMultiLocation } =
    useLocation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // A single-location gym has nothing to choose between.
  if (!isMultiLocation) return null;

  const options = (
    <div role="listbox" aria-label="Choose your gym">
      {locations.map((option, index) => {
        const selected = option.slug === location.slug;
        return (
          <button
            key={option.slug}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => {
              setLocationSlug(option.slug);
              setOpen(false);
            }}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 border-0 px-4 py-[14px] text-left text-text transition-colors hover:bg-surface2",
              index < locations.length - 1 && "border-b border-line",
              selected ? "bg-accent-soft" : "bg-transparent",
            )}
          >
            <span className="min-w-0 flex-auto">
              <span className="block text-[14px] font-semibold">
                {option.name}
              </span>
              <span className="mt-0.5 block text-[12px] text-muted">
                {option.city} · {shortHours(option.hours_summary)}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-[14px] text-accent"
            >
              {selected ? "✓" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (variant === "bar") {
    return (
      <div className={cn("border-t border-line bg-surface2", className)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={menuId}
          className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-[10px] text-left text-text"
        >
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
          />
          <span className="min-w-0 flex-auto truncate text-[12px] font-semibold">
            {location.name}
          </span>
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[.1em] text-accent">
            Change ▼
          </span>
        </button>
        {open ? (
          <div id={menuId} className="border-t border-line bg-surface">
            {options}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        className="flex cursor-pointer items-center gap-2 rounded-pill border border-line bg-surface2 px-[13px] py-2 text-text transition-colors hover:border-accent"
      >
        <span
          aria-hidden="true"
          className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
        />
        <span className="whitespace-nowrap text-[12px] font-semibold tracking-[.03em]">
          {location.short_name}
        </span>
        <span aria-hidden="true" className="text-[9px] text-muted">
          ▼
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute right-0 top-[46px] z-[80] w-[280px] overflow-hidden rounded-[12px] border border-line bg-surface shadow-menu"
        >
          <div className="border-b border-line px-4 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted">
            Choose your gym
          </div>
          {options}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Drops the day range from an hours summary, keeping only the times.
 *
 * The menu row already says which gym it is; repeating the days there costs
 * width the design doesn't have.
 */
function shortHours(summary: string): string {
  const parts = summary.split("·");
  return (parts.at(-1) ?? summary).trim();
}
