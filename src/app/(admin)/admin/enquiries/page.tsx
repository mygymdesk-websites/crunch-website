import { Badge, Heading } from "@/components/ui/Primitives";
import { getAdminGate } from "@/lib/admin-auth";
import { formatDate, formatPhone } from "@/lib/format";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Enquiry } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

/**
 * Enquiries — read-only.
 *
 * MyGymDesk is the system of record for leads; the sales team works them in
 * the CRM. This list exists so the client can see what the website captured
 * without an MGD login, and so nothing is lost if the MGD forward fails.
 *
 * `mgd_sync_status` is shown from day one: in Phase 1 everything reads
 * "Pending", and once the forward is wired it becomes the queue of leads that
 * still need replaying.
 */
export default async function AdminEnquiriesPage() {
  const gate = await getAdminGate();
  if (gate.status !== "ok") return null;

  const supabase = await getServerSupabase();
  const { data, error } = supabase
    ? await supabase
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE)
    : { data: null, error: null };

  const enquiries = (data ?? []) as Enquiry[];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading as="h1" size="sub" className="mb-2">
            Enquiries
          </Heading>
          <p className="m-0 max-w-[60ch] text-[14px] leading-[1.65] text-muted">
            Every lead the website captured — trial bookings, contact forms and
            appointment requests. Read-only here; work them in MyGymDesk under{" "}
            <b className="text-text">Leads → Enquiries</b>.
          </p>
        </div>
        <a
          href="https://app.mygymdesk.in"
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-pill border border-line px-5 py-3 text-[12px] font-bold uppercase tracking-[.08em] transition-colors hover:border-accent"
        >
          Manage in MyGymDesk →
        </a>
      </div>

      {error ? (
        <div className="rounded-[16px] border border-accent bg-accent-soft p-5 text-[13px] text-muted">
          Could not load enquiries: {error.message}
        </div>
      ) : enquiries.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-surface px-5 py-14 text-center">
          <div className="mb-2 font-display text-[19px] font-semibold uppercase">
            No enquiries yet
          </div>
          <p className="mx-auto m-0 max-w-[46ch] text-[13px] leading-[1.6] text-muted">
            Trial bookings and contact-form submissions land here the moment
            they come in.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-line bg-surface">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface2">
                {["When", "Who", "Interest", "Gym", "Source", "MGD"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enquiry) => (
                <tr
                  key={enquiry.id}
                  className="border-b border-line align-top last:border-b-0"
                >
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-muted">
                    {formatDate(enquiry.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-[14px] font-semibold">
                      {enquiry.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      <a href={`tel:${enquiry.phone}`}>
                        {formatPhone(enquiry.phone)}
                      </a>
                      {enquiry.email ? (
                        <>
                          {" · "}
                          <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                        </>
                      ) : null}
                    </div>
                    {enquiry.message ? (
                      <p className="m-0 mt-1.5 max-w-[46ch] text-[12px] leading-[1.5] text-muted">
                        {enquiry.message}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-[13px]">
                    {enquiry.interest ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted">
                    {enquiry.location_slug ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-muted">
                    <div>{enquiry.source.replace(/_/g, " ")}</div>
                    {enquiry.source_page ? (
                      <div className="mt-0.5 font-mono text-[11px]">
                        {enquiry.source_page}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <SyncBadge status={enquiry.mgd_sync_status} />
                    {enquiry.mgd_error ? (
                      <div className="mt-1 max-w-[22ch] text-[11px] text-muted">
                        {enquiry.mgd_error}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {enquiries.length >= PAGE_SIZE ? (
        <p className="mt-4 text-[12px] text-muted">
          Showing the {PAGE_SIZE} most recent. Paging lands with the Phase 5
          admin work.
        </p>
      ) : null}
    </>
  );
}

function SyncBadge({ status }: { status: Enquiry["mgd_sync_status"] }) {
  const map = {
    sent: { tone: "accent" as const, label: "Sent" },
    pending: { tone: "muted" as const, label: "Pending" },
    failed: { tone: "dark" as const, label: "Failed" },
    skipped: { tone: "muted" as const, label: "Skipped" },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
