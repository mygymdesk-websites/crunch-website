"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip, Heading, SkeletonBlock } from "@/components/ui/Primitives";
import type { MgdClassType } from "@/lib/mgd/types";
import { ClassCard } from "./ClassCard";

/**
 * The filterable class catalog.
 *
 * Categories are derived from the data (`sport`) rather than hardcoded, so a
 * new class type added in MyGymDesk gets its own filter automatically.
 */
export function ClassCatalog({ classes }: { classes: MgdClassType[] }) {
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const found = new Set(classes.map((c) => c.sport ?? "Other"));
    return ["All", ...Array.from(found).sort()];
  }, [classes]);

  const visible = classes.filter(
    (c) => category === "All" || (c.sport ?? "Other") === category,
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
        <Heading className="!text-[clamp(24px,3.4vw,40px)]">
          Class catalog
        </Heading>
        <span className="text-[13px] text-muted">
          {visible.length} of {classes.length} classes
        </span>
      </div>

      <div
        className="mb-[22px] flex flex-wrap gap-[9px]"
        role="group"
        aria-label="Filter classes by category"
      >
        {categories.map((option) => (
          <Chip
            key={option}
            active={option === category}
            onClick={() => setCategory(option)}
          >
            {option}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-line px-6 py-[52px] text-center">
          <div className="mb-2 font-display text-[20px] font-semibold uppercase">
            No classes in this category
          </div>
          <p className="m-0 mb-[18px] text-[14px] text-muted">
            Try another category, or see everything on the schedule.
          </p>
          <Button size="sm" onClick={() => setCategory("All")}>
            Show all classes
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
          {visible.map((classType) => (
            <ClassCard
              key={classType.id}
              classType={classType}
              showIntensityChip
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Loading state for the catalog grid. */
export function ClassCatalogSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="animate-[shimmer_1.4s_ease-in-out_infinite] overflow-hidden rounded-card border border-line bg-surface"
        >
          <SkeletonBlock className="h-[168px]" />
          <div className="p-[18px]">
            <SkeletonBlock className="mb-2.5 h-3.5 w-3/5 rounded" />
            <SkeletonBlock className="mb-2.5 h-3 rounded" />
            <SkeletonBlock className="mb-4 h-3 w-4/5 rounded" />
            <SkeletonBlock className="h-9 rounded-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}
