import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * The wordmark: a skewed accent square plus "CRUNCH." with an accent full stop.
 *
 * Documented in the design system as a PLACEHOLDER — the client's real logo
 * replaces it. Kept as markup rather than an asset so the swap is one file.
 */
export function Logo({
  size = "header",
  className,
  href = "/",
}: {
  size?: "header" | "footer";
  className?: string;
  href?: string | null;
}) {
  const square = size === "header" ? "h-6 w-6" : "h-[22px] w-[22px]";
  const text = size === "header" ? "text-[21px]" : "text-[20px]";

  const mark = (
    <>
      <span
        aria-hidden="true"
        className={cn("block skew-x-[-12deg] bg-accent", square)}
      />
      <span
        className={cn(
          "font-display font-semibold uppercase leading-none tracking-[.06em]",
          text,
        )}
      >
        Crunch<span className="text-accent">.</span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div className={cn("flex shrink-0 items-center gap-[9px]", className)}>
        {mark}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label="Crunch Fitness — home"
      className={cn("flex shrink-0 items-center gap-[9px]", className)}
    >
      {mark}
    </Link>
  );
}
