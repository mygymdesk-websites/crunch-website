"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { useTrialModal } from "@/components/providers/TrialModalProvider";
import { ButtonLink } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { HERO_IMAGE, HERO_STATS } from "@/lib/fixtures/site-content";

/**
 * The homepage hero, ported from the design's documented hero pattern:
 * split grid; left is a two-part badge, display headline with one accent word,
 * muted sub, pill CTAs and a stat row; right is a circular photo inside a
 * pulsing accent ring and a dashed spinning ring, with a floating heart-rate
 * chip and a full-width striped progress card.
 *
 * The "Two Locations" badge counts `site_settings` rather than saying "two".
 */
export function Hero() {
  const { locations, location } = useLocation();
  const { openTrial } = useTrialModal();

  const countWord =
    locations.length === 1
      ? "One Location"
      : locations.length === 2
        ? "Two Locations"
        : `${locations.length} Locations`;

  return (
    <section className="relative overflow-hidden border-b border-line bg-bg">
      {/* Accent glow washes + drifting squares. Decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[200px] -top-[260px] h-[680px] w-[680px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--accent-soft) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[180px] -left-[220px] h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--accent-soft) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-[6%] top-[14%] h-3.5 w-3.5 rotate-[18deg] animate-[floatY_7s_ease-in-out_infinite] bg-surface2"
      />
      <div
        aria-hidden="true"
        className="absolute left-[44%] top-[64%] h-2.5 w-2.5 -rotate-12 animate-[floatY_9s_ease-in-out_infinite_reverse] bg-surface2"
      />

      <div className="relative mx-auto grid w-full max-w-content grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-12 px-5 py-16 [min-height:min(82vh,720px)]">
        <div>
          <div className="mb-6 inline-flex animate-[fadeUp_.7s_.05s_both] items-stretch overflow-hidden rounded-lg border border-line">
            <span className="bg-accent px-[13px] py-2 text-[11px] font-bold uppercase tracking-[.12em] text-accent-ink">
              {countWord}
            </span>
            <span className="bg-surface px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[.12em] text-text">
              {locations.map((l) => l.short_name).join(" · ")}
            </span>
          </div>

          <h1 className="m-0 mb-5 max-w-[14ch] animate-[fadeUp_.7s_.15s_both] font-display text-[clamp(40px,6.4vw,84px)] font-bold uppercase leading-[1.02] text-text [text-wrap:balance]">
            Show up.
            <br />
            Lift heavy.
            <br />
            <span className="text-accent">Repeat.</span>
          </h1>

          <p className="m-0 mb-[30px] max-w-[48ch] animate-[fadeUp_.7s_.25s_both] text-[clamp(15px,1.8vw,18px)] leading-[1.6] text-muted">
            Free weights, strength machines and group classes across two floors
            — run by coaches who actually know your name.
          </p>

          <div className="flex animate-[fadeUp_.7s_.35s_both] flex-wrap gap-3">
            <ButtonLink href="/packages" size="lg" className="hover:-translate-y-0.5">
              Join Now
            </ButtonLink>
            <button
              type="button"
              onClick={() => openTrial()}
              className="cursor-pointer rounded-pill border border-line bg-transparent px-8 py-4 text-[13px] font-bold uppercase tracking-[.08em] text-text transition-[border-color,color,transform] duration-250 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            >
              Book Free Trial
            </button>
          </div>

          <div className="mt-[42px] flex animate-[fadeUp_.7s_.45s_both] flex-wrap gap-8 border-t border-line pt-6">
            {HERO_STATS.map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-[29px] font-bold leading-none text-text">
                  {stat.value}
                </div>
                <div className="mt-1 text-[12px] uppercase tracking-[.1em] text-muted">
                  {stat.label}
                </div>
              </div>
            ))}
            {/* Opening hours follow the selected gym. */}
            <div>
              <div className="font-display text-[29px] font-bold leading-none text-text">
                {location.hours_summary.split("·").at(-1)?.trim()}
              </div>
              <div className="mt-1 text-[12px] uppercase tracking-[.1em] text-muted">
                Open daily
              </div>
            </div>
          </div>
        </div>

        <div className="animate-[fadeUp_.8s_.3s_both]">
          <div className="relative mx-auto aspect-square w-[min(460px,86vw)]">
            <div
              aria-hidden="true"
              className="absolute -inset-[5%] rounded-full border border-accent-soft"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 animate-[pulseRing_4.5s_ease-in-out_infinite] rounded-full border-2 border-accent opacity-80"
            />
            <div
              aria-hidden="true"
              className="absolute inset-[6.5%] animate-[spinSlow_50s_linear_infinite] rounded-full border border-dashed border-accent opacity-45"
            />
            <div className="absolute inset-[13%] overflow-hidden rounded-full border border-line bg-surface2">
              <CoverImage
                src={HERO_IMAGE}
                alt="Athlete training with a dumbbell"
                placeholderLabel="gym floor photo"
                eager
              />
            </div>

            <div className="absolute -right-[3%] top-[9%] flex animate-[floatY_6s_ease-in-out_infinite] items-center gap-3 rounded-[12px] border border-line bg-surface px-[17px] py-[13px] shadow-float">
              <span
                aria-hidden="true"
                className="inline-block animate-[heartBeat_1.5s_ease-in-out_infinite] text-[20px] text-accent"
              >
                ♥
              </span>
              <span>
                <span className="block text-[11px] tracking-[.06em] text-muted">
                  Heart Rate
                </span>
                <span className="mt-px block text-[17px] font-bold">142 bpm</span>
              </span>
            </div>

            <div className="absolute -bottom-[7%] -left-[6%] -right-[6%] animate-[floatY_7.5s_ease-in-out_infinite_reverse] rounded-card border border-line bg-surface px-5 py-4 shadow-float">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[.1em] text-muted">
                  Today&rsquo;s session goal
                </span>
                <span className="text-[16px] font-bold text-accent">76%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-surface2">
                <div
                  className="h-full w-[76%] animate-[fillBar_1.6s_.6s_ease-out_both,progressStripe_1.2s_linear_infinite] rounded-pill"
                  style={{
                    background:
                      "repeating-linear-gradient(-55deg, var(--accent) 0 10px, color-mix(in srgb, var(--accent) 78%, white) 10px 20px)",
                    backgroundSize: "28px 100%",
                  }}
                />
              </div>
              <div className="mt-[9px] flex justify-between gap-3 text-[11px] text-muted">
                <span>320 kcal burned</span>
                <span>Goal 420 kcal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
