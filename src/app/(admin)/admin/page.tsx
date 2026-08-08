import { LocationEditor } from "@/components/admin/LocationEditor";
import { Heading } from "@/components/ui/Primitives";
import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import type { SiteLocationAdmin } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * Site Settings.
 *
 * Reads the BASE table (not the public view) so admins can see and edit the
 * internal columns too — `mgd_location_id` and `is_active`. RLS allows that
 * read only for `is_admin()`.
 */
export default async function AdminSettingsPage() {
  const gate = await getAdminGate();
  if (gate.status !== "ok") return null;

  const supabase = await getServerSupabase();
  const { data, error } = supabase
    ? await supabase
        .from("site_settings")
        .select("*")
        .order("display_order", { ascending: true })
    : { data: null, error: null };

  const locations = (data ?? []) as SiteLocationAdmin[];
  const canEdit = canEditSettings(gate.admin);

  return (
    <>
      <div className="mb-6">
        <Heading as="h1" size="sub" className="mb-2">
          Site settings
        </Heading>
        <p className="m-0 max-w-[62ch] text-[14px] leading-[1.65] text-muted">
          Contact details, hours, socials and map links for each gym. These
          drive the header selector, the footer, the contact page and every
          location-aware surface on the site.
        </p>
      </div>

      {error ? (
        <Panel tone="error">
          Could not load locations: {error.message}
        </Panel>
      ) : locations.length === 0 ? (
        <Panel>
          No locations found. Apply <code>supabase/seed.sql</code> to create
          them, or insert a <code>site_settings</code> row directly.
        </Panel>
      ) : (
        <div className="grid gap-5">
          {locations.map((location) => (
            <LocationEditor
              key={location.id}
              location={location}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      <Panel className="mt-6">
        <b className="text-text">Adding a third gym.</b> Insert a{" "}
        <code>site_settings</code> row (easiest via{" "}
        <code>supabase/seed/locations.seed.json</code> +{" "}
        <code>npm run seed:generate</code>), set its MyGymDesk branch UUID
        above, and it appears in the selector, the footer and the contact page
        automatically. No code change is needed —{" "}
        <code>npm run check:locations</code> enforces that.
      </Panel>
    </>
  );
}

function Panel({
  children,
  tone = "info",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
  className?: string;
}) {
  return (
    <div
      className={`rounded-[16px] border p-5 text-[13px] leading-[1.7] text-muted ${
        tone === "error"
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface"
      } ${className}`}
    >
      {children}
    </div>
  );
}
