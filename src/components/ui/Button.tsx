import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The design's one button shape: a full pill, uppercase verb, .08em tracking.
 *
 * Variants and sizes are transcribed from the export rather than invented —
 * each size below corresponds to a real button in the design.
 */

export type ButtonVariant = "primary" | "outline" | "dark" | "quiet";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-bold uppercase " +
  "tracking-[.08em] whitespace-nowrap transition-[filter,transform,border-color,color,background-color] " +
  "duration-250 ease-out disabled:cursor-not-allowed disabled:opacity-55";

const VARIANTS: Record<ButtonVariant, string> = {
  // Accent fill. The primary CTA everywhere: Book Free Trial, Join Now, Pay.
  primary:
    "bg-accent text-accent-ink border-0 hover:brightness-[1.08] " +
    "disabled:hover:brightness-100",
  // Hairline outline that turns accent on hover. Secondary actions.
  outline:
    "bg-transparent text-text border border-line hover:border-accent hover:text-accent " +
    "disabled:hover:border-line disabled:hover:text-text",
  // Near-black on the accent band, where an accent button would vanish.
  dark: "bg-[#0B0B0C] text-white border-0 hover:-translate-y-0.5",
  // Text-weight action inside a card footer.
  quiet:
    "bg-transparent text-text border border-line hover:bg-accent hover:border-accent hover:text-accent-ink",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "px-4 py-2 text-[11px]", //  card footer "Book"
  sm: "px-[26px] py-[13px] text-[12px]", //  modal + inline actions
  md: "px-5 py-[15px] text-[13px]", //  full-width form submit
  lg: "px-8 py-4 text-[13px]", //  hero CTAs
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width — the design's full-width form buttons. */
  block?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        !rest.disabled && "cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

/** Same shape, for navigation. Keeps accent ink on hover so fills stay legible. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        variant === "primary" && "hover:text-accent-ink",
        variant === "dark" && "hover:text-white",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
