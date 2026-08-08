import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Form fields, per the design system's forms pattern:
 * 10px radius, 1px --line border, page-bg fill, accent border on focus.
 *
 * Every field is labelled. The design uses placeholders as labels; a
 * placeholder is not an accessible name, so the label is rendered visually
 * hidden and the placeholder is kept exactly as drawn.
 */

const FIELD =
  "w-full rounded-field border border-line bg-bg px-[15px] py-[13px] text-[14px] " +
  "text-text placeholder:text-muted transition-colors duration-200 " +
  "focus:border-accent focus:outline-none disabled:opacity-60";

interface LabelProps {
  /** Accessible name. Rendered visually hidden unless `showLabel`. */
  label: string;
  showLabel?: boolean;
  hint?: ReactNode;
  error?: string | null;
}

function FieldShell({
  id,
  label,
  showLabel,
  hint,
  error,
  children,
}: LabelProps & { id: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className={
          showLabel
            ? "text-[11px] font-bold uppercase tracking-[.14em] text-muted"
            : "sr-only"
        }
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-muted">{hint}</p> : null}
      {error ? (
        <p className="text-[12px] text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = LabelProps &
  Omit<ComponentPropsWithoutRef<"input">, "className" | "id"> & {
    id: string;
    className?: string;
  };

export function Input({
  id,
  label,
  showLabel,
  hint,
  error,
  className,
  ...rest
}: InputProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      showLabel={showLabel}
      hint={hint}
      error={error}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD, error && "border-accent", className)}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectProps = LabelProps &
  Omit<ComponentPropsWithoutRef<"select">, "className" | "id"> & {
    id: string;
    className?: string;
  };

export function Select({
  id,
  label,
  showLabel,
  hint,
  error,
  className,
  children,
  ...rest
}: SelectProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      showLabel={showLabel}
      hint={hint}
      error={error}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD, "cursor-pointer", error && "border-accent", className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

type TextareaProps = LabelProps &
  Omit<ComponentPropsWithoutRef<"textarea">, "className" | "id"> & {
    id: string;
    className?: string;
  };

export function Textarea({
  id,
  label,
  showLabel,
  hint,
  error,
  className,
  rows = 3,
  ...rest
}: TextareaProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      showLabel={showLabel}
      hint={hint}
      error={error}
    >
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD, "resize-y", error && "border-accent", className)}
        {...rest}
      />
    </FieldShell>
  );
}

/**
 * Honeypot. Humans leave it empty; bots fill every field.
 *
 * Deliberately NOT `type="hidden"` — bots skip those. Positioned off-screen
 * and removed from the accessibility tree instead.
 */
export function Honeypot({ name = "company" }: { name?: string }) {
  return (
    <input
      type="text"
      name={name}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute -left-[9999px] h-px w-px opacity-0"
    />
  );
}
