"use client";

import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { Badge, Heading } from "@/components/ui/Primitives";
import { formatDuration, formatINR } from "@/lib/format";
import { CLASS_IMAGES } from "@/lib/fixtures/classes";
import type { MgdClassType } from "@/lib/mgd/types";

/** `1` low · `2` medium · `3` high — the API's numeric scale, as words. */
export function intensityLabel(intensity: number): string {
  return intensity === 3 ? "High" : intensity === 1 ? "Low" : "Medium";
}

/** Chip tone per intensity, matching the design's Classes page. */
function intensityTone(intensity: number): "accent" | "dark" | "light" {
  if (intensity === 3) return "accent";
  if (intensity === 2) return "dark";
  return "light";
}

/**
 * A class-type card, shaped by the MGD `resource=catalog` row.
 *
 * The Book button opens the trial modal pre-set to that class. Real per-session
 * booking (order → Razorpay → confirm) is Phase 3 and needs a live session id,
 * which is why it is not faked here.
 */
export function ClassCard({
  classType,
  showIntensityChip = false,
}: {
  classType: MgdClassType;
  showIntensityChip?: boolean;
}) {
  const { openTrial } = useTrialModal();
  const price = classType.priceNonMember;

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-accent">
      <div className="relative h-[168px] overflow-hidden">
        <CoverImage
          src={CLASS_IMAGES[classType.name]}
          alt={classType.name}
          placeholderLabel={`class photo — ${classType.name.toLowerCase()}`}
        />
        {classType.sport ? (
          <span className="absolute left-3 top-3">
            <Badge tone="dark">{classType.sport}</Badge>
          </span>
        ) : null}
        {showIntensityChip ? (
          <span className="absolute right-3 top-3">
            <Badge tone={intensityTone(classType.intensity)}>
              {intensityLabel(classType.intensity)}
            </Badge>
          </span>
        ) : null}
      </div>

      <div className="flex flex-auto flex-col p-[18px]">
        <div className="mb-2 flex items-center gap-[9px]">
          <Heading as="h3" size="card" className="!text-[18px]">
            {classType.name}
          </Heading>
          {!showIntensityChip ? (
            <span className="rounded border border-line px-2 py-[3px] text-[9px] font-bold uppercase tracking-[.08em] text-muted">
              {intensityLabel(classType.intensity)}
            </span>
          ) : null}
        </div>

        <p className="m-0 mb-4 flex-auto text-[13px] leading-[1.6] text-muted">
          {classType.description}
        </p>

        <div className="flex items-center justify-between gap-2.5 border-t border-line pt-3.5">
          <div>
            {/* price 0 = "no price set" in the MGD contract, never "free". */}
            <span className="text-[15px] font-bold">
              {price > 0 ? formatINR(price) : "Ask at the desk"}
            </span>
            {classType.durationMin ? (
              <span className="text-[12px] text-muted">
                {" "}
                · {formatDuration(classType.durationMin)}
              </span>
            ) : null}
          </div>
          <Button
            variant="quiet"
            size="xs"
            onClick={() => openTrial(classType.name)}
          >
            Book
          </Button>
        </div>
      </div>
    </article>
  );
}
