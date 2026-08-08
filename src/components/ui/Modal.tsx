"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The design's modal shell: a 72%-black scrim, a centred surface panel with a
 * 16px radius, and a circular ✕ in the top-right.
 *
 * Adds the behaviour the static design couldn't express — Escape to close,
 * focus moved into the dialog and restored on close, background scroll locked,
 * and a click on the scrim (but not the panel) dismissing it.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  maxWidth = 520,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** id of the element naming this dialog. */
  labelledBy?: string;
  children: ReactNode;
  maxWidth?: number;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep Tab inside the dialog.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel itself rather than the ✕, so a screen reader announces
    // the dialog before its dismiss control.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center overflow-auto bg-black/[.72] p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={{ maxWidth }}
        className={cn(
          "relative w-full rounded-[16px] border border-line bg-surface p-[30px] outline-none",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 h-8 w-8 cursor-pointer rounded-full border border-line bg-transparent text-text transition-colors hover:border-accent"
        >
          <span aria-hidden="true">✕</span>
        </button>
        {children}
      </div>
    </div>
  );
}

/** The accent circle + tick used by every "done" state in the design. */
export function SuccessMark() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mb-[18px] grid h-14 w-14 place-items-center rounded-full bg-accent text-[26px] text-accent-ink"
    >
      ✓
    </div>
  );
}

/** The spinner used by every "…ing" state in the design. */
export function Spinner({ label }: { label: string }) {
  return (
    <div className="py-11 text-center" role="status" aria-live="polite">
      <div
        aria-hidden="true"
        className="mx-auto mb-[18px] h-[38px] w-[38px] animate-[spin_.8s_linear_infinite] rounded-full border-[3px] border-line border-t-accent"
      />
      <div className="font-display text-[20px] font-semibold uppercase">
        {label}
      </div>
    </div>
  );
}
