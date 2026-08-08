import { Heading } from "@/components/ui/Primitives";

/**
 * Orders and Shipments exist in the nav from day one so the client can see the
 * shape of the finished panel, but nothing writes `shop_orders` or `shipments`
 * until Phase 5 — so these say so rather than showing a fake empty table.
 */
export function PhaseFivePlaceholder({
  title,
  summary,
  bullets,
  dependsOn,
}: {
  title: string;
  summary: string;
  bullets: string[];
  dependsOn: string;
}) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Heading as="h1" size="sub">
          {title}
        </Heading>
        <span className="rounded-pill bg-surface2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-muted">
          Phase 5
        </span>
      </div>

      <div className="rounded-[16px] border border-line bg-surface p-6">
        <p className="m-0 mb-5 max-w-[62ch] text-[14px] leading-[1.7] text-muted">
          {summary}
        </p>

        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
          What lands here
        </div>
        <ul className="m-0 mb-5 grid list-none gap-2.5 p-0">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-[11px] text-[14px] leading-[1.6] text-muted"
            >
              <span aria-hidden="true" className="shrink-0 text-accent">
                —
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-field border border-line bg-bg p-4 text-[13px] leading-[1.65] text-muted">
          <b className="text-text">Blocked on:</b> {dependsOn}
        </div>
      </div>
    </>
  );
}
