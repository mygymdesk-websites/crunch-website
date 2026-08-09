"use client";

import { useMemo, useState } from "react";

import { BookingModal } from "@/components/classes/BookingModal";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { Chip, SkeletonBlock } from "@/components/ui/Primitives";
import {
  DAY_LABELS_FULL,
  DAY_LABELS_SHORT,
  addDays,
  formatDayMonth,
  formatDuration,
  formatTime,
  todayIST,
} from "@/lib/format";
import type { DayOfWeek, MgdClassSession } from "@/lib/mgd/types";

/**
 * The weekly timetable.
 *
 * MyGymDesk returns a WEEKLY TEMPLATE, not a dated calendar: sessions in the
 * next 90 days collapse to one row per (weekday + time + class type). This
 * component projects that template onto the current Mon–Sun week so a visitor
 * sees real dates, which is what the design draws.
 *
 * Booking rows hand the whole session to `BookingModal`, which re-resolves the
 * bookable id server-side before quoting. Nothing here books the id it is
 * holding: this list is cached for 15 minutes and each `id` is the next real
 * occurrence, which rolls forward as occurrences pass.
 */

interface DayColumn {
  dayOfWeek: DayOfWeek;
  short: string;
  full: string;
  date: string;
  sessions: MgdClassSession[];
}

export function Timetable({
  sessions,
  locationShortName,
  degraded = false,
}: {
  sessions: MgdClassSession[];
  locationShortName: string;
  /** True when the API call failed, as opposed to returning nothing. */
  degraded?: boolean;
}) {
  const { openTrial } = useTrialModal();
  const [activeIndex, setActiveIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState("All");
  const [booking, setBooking] = useState<MgdClassSession | null>(null);

  // Monday-first week starting from this Monday, in IST.
  const week = useMemo<DayColumn[]>(() => {
    const today = todayIST();
    // getDay() is Sunday-first; shift so Monday is the start of the week.
    const offsetToMonday = (today.getDay() + 6) % 7;
    const monday = addDays(today, -offsetToMonday);

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const dayOfWeek = date.getDay() as DayOfWeek;
      return {
        dayOfWeek,
        short: DAY_LABELS_SHORT[dayOfWeek],
        full: DAY_LABELS_FULL[dayOfWeek],
        date: formatDayMonth(date),
        sessions: sessions
          .filter((s) => s.dayOfWeek === dayOfWeek)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      };
    });
  }, [sessions]);

  const day = week[activeIndex] ?? week[0];

  const types = useMemo(() => {
    const found = new Set(day.sessions.map((s) => s.sport ?? "Class"));
    return ["All", ...Array.from(found)];
  }, [day]);

  const visible = day.sessions.filter(
    (s) => typeFilter === "All" || (s.sport ?? "Class") === typeFilter,
  );

  // Two different empty states. "Nothing scheduled" is a real state on a
  // branch created in MyGymDesk but not yet timetabled; "we couldn't reach it"
  // is our problem and should not be dressed up as the gym's.
  if (sessions.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line px-6 py-[60px] text-center">
        <div className="mb-2.5 font-display text-[22px] font-semibold uppercase">
          {degraded
            ? "The timetable is briefly unavailable"
            : "No classes scheduled at this location yet"}
        </div>
        <p className="mx-auto m-0 mb-5 max-w-[46ch] text-[14px] text-muted">
          {degraded
            ? "We couldn't reach the gym's scheduling system. Please try again shortly, or call the desk — the classes are still running."
            : `The ${locationShortName} timetable goes live once the studio schedule is published. Ask the front desk, or book a free trial and we'll call you when it opens.`}
        </p>
        <Button size="sm" onClick={() => openTrial()}>
          Book Free Trial
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(74px,1fr))] gap-2">
        {week.map((column, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={column.dayOfWeek}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                setTypeFilter("All");
              }}
              aria-pressed={active}
              className={`cursor-pointer rounded-[10px] border-0 px-2 py-3.5 text-center transition-transform duration-200 hover:-translate-y-0.5 ${
                active
                  ? "bg-accent text-accent-ink"
                  : "bg-surface2 text-text"
              }`}
            >
              <span className="block font-display text-[16px] font-semibold uppercase tracking-[.04em]">
                {column.short}
              </span>
              <span className="mt-[3px] block text-[11px] opacity-80">
                {column.date}
              </span>
              <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-[.08em] opacity-70">
                {column.sessions.length} cls
              </span>
            </button>
          );
        })}
      </div>

      {types.length > 2 ? (
        <div className="mb-[18px] flex flex-wrap gap-2">
          {types.map((type) => (
            <Chip
              key={type}
              active={type === typeFilter}
              onClick={() => setTypeFilter(type)}
              className="!px-[15px] !py-2"
            >
              {type}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-t-[12px] bg-accent px-[18px] py-3.5 text-accent-ink">
        <span className="font-display text-[19px] font-semibold uppercase tracking-[.04em]">
          {day.full} {day.date}
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-[.06em] opacity-90">
          {visible.length} {visible.length === 1 ? "class" : "classes"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-b-[12px] border border-t-0 border-line px-5 py-11 text-center">
          <div className="mb-1.5 font-display text-[18px] font-semibold uppercase">
            Nothing on this day
          </div>
          <p className="m-0 text-[13px] text-muted">
            Try another day or clear the class-type filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-b-[12px] border border-t-0 border-line">
          {visible.map((session) => (
            <TimetableRow
              key={session.id}
              session={session}
              onBook={() => setBooking(session)}
            />
          ))}
        </div>
      )}

      <BookingModal
        session={booking}
        open={booking !== null}
        onClose={() => setBooking(null)}
      />
    </div>
  );
}

function TimetableRow({
  session,
  onBook,
}: {
  session: MgdClassSession;
  onBook: () => void;
}) {
  const { openTrial } = useTrialModal();
  // `spotsBooked` can under-report on very busy gyms, so treat "at or over
  // capacity" as full rather than testing for exact equality.
  const full = session.spotsBooked >= session.spotsTotal;
  const left = Math.max(0, session.spotsTotal - session.spotsBooked);

  // A zero-priced session cannot be booked online: the API refuses it with
  // `session_not_priced`. Say so on the row rather than letting someone fill in
  // a form that is guaranteed to dead-end.
  const unpriced = session.priceNonMember <= 0;
  const pct = Math.min(
    100,
    Math.round((session.spotsBooked / Math.max(1, session.spotsTotal)) * 100),
  );

  const spotsLabel = full
    ? `${session.spotsTotal}/${session.spotsTotal} booked`
    : left <= 3
      ? `${left} spot${left === 1 ? "" : "s"} left`
      : `${session.spotsBooked}/${session.spotsTotal} booked`;

  return (
    <div
      className="flex flex-wrap items-center gap-4 border-b border-line bg-bg px-[18px] py-4 last:border-b-0"
      style={{ opacity: full ? 0.45 : 1 }}
    >
      <span className="min-w-[70px] shrink-0 border-r border-line pr-4">
        <span className="block font-display text-[22px] font-semibold leading-none">
          {formatTime(session.startTime)}
        </span>
        <span className="mt-[3px] block text-[11px] text-muted">
          {formatDuration(session.durationMin)}
        </span>
      </span>

      <span className="min-w-0 flex-[1_1_190px]">
        <span className="mb-1.5 flex flex-wrap items-center gap-[9px]">
          <span className="text-[16px] font-bold">{session.name}</span>
          {session.sport ? (
            <span className="rounded bg-surface2 px-2 py-[3px] text-[9px] font-bold uppercase tracking-[.08em] text-muted">
              {session.sport}
            </span>
          ) : null}
        </span>
        {session.instructorName ? (
          <span className="flex items-center gap-[7px]">
            <span className="h-[22px] w-[22px] shrink-0 overflow-hidden rounded-full">
              <CoverImage
                src={session.instructorAvatarUrl}
                alt={session.instructorName}
                placeholderLabel=""
                objectPosition="74% 30%"
              />
            </span>
            <span className="text-[12px] text-muted">
              {session.instructorName}
            </span>
          </span>
        ) : null}
      </span>

      <span className="min-w-[104px] shrink-0 text-right">
        <span
          className={`mb-[5px] block text-[12px] font-semibold ${
            !full && left <= 3 ? "text-accent" : "text-muted"
          }`}
        >
          {spotsLabel}
        </span>
        <span className="block h-[5px] overflow-hidden rounded-pill bg-surface2">
          <span
            className={`block h-full ${full ? "bg-muted" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>

      <button
        type="button"
        disabled={full}
        // An unpriced class cannot take money, so it routes to the enquiry
        // form rather than a booking form that would dead-end at the quote.
        onClick={unpriced ? () => openTrial(session.name) : onBook}
        aria-label={
          full
            ? `${session.name} at ${formatTime(session.startTime)} is full`
            : unpriced
              ? `Enquire about ${session.name} at ${formatTime(session.startTime)}`
              : `Book ${session.name} at ${formatTime(session.startTime)}`
        }
        className={`shrink-0 rounded-pill border px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] transition-[filter] ${
          full
            ? "cursor-default border-line bg-transparent text-muted"
            : unpriced
              ? "cursor-pointer border-line bg-transparent text-text hover:brightness-[1.08]"
              : "cursor-pointer border-accent bg-accent text-accent-ink hover:brightness-[1.08]"
        }`}
      >
        {full ? "Full" : unpriced ? "Enquire" : "Book"}
      </button>
    </div>
  );
}

/** Loading state — seven shimmering day columns, per the design. */
export function TimetableSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="animate-[shimmer_1.4s_ease-in-out_infinite]">
          <SkeletonBlock className="mb-3.5 h-3.5 w-3/5 rounded" />
          <SkeletonBlock className="mb-2.5 h-24 rounded-[10px]" />
          <SkeletonBlock className="mb-2.5 h-24 rounded-[10px]" />
          <SkeletonBlock className="h-24 rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}
