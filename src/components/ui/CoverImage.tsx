"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { StripedPlaceholder } from "./Primitives";

/**
 * An `object-fit: cover` image that degrades to the design system's striped
 * placeholder rather than a broken-image icon.
 *
 * The design's own fallback swaps in a random stock photo. That is fine for a
 * mock and wrong for a live gym site — a placeholder that announces itself is
 * more honest than a stranger's photo standing in for the client's floor.
 *
 * Plain <img> on purpose: the photography here is Unsplash stand-in content
 * that the client's own shoot replaces, and next/image's optimiser adds cost
 * and config surface for images that are about to be thrown away. Swap to
 * next/image when the real assets land (see HANDOFF.md).
 */
export function CoverImage({
  src,
  alt,
  placeholderLabel,
  className,
  imgClassName,
  eager = false,
  objectPosition,
}: {
  src: string | null | undefined;
  alt: string;
  /** Monospace text shown when there is no usable image. */
  placeholderLabel?: string;
  className?: string;
  imgClassName?: string;
  /** Skip lazy-loading for above-the-fold imagery. */
  eager?: boolean;
  objectPosition?: string;
}) {
  const [failed, setFailed] = useState(false);
  const label = placeholderLabel ?? alt.toLowerCase();

  if (!src || failed) {
    return (
      <div className={cn("h-full w-full", className)}>
        <StripedPlaceholder label={label} />
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        style={objectPosition ? { objectPosition } : undefined}
        className={cn("block h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}
