import { ContentBoard } from "@/components/admin/ContentBoard";
import { Heading } from "@/components/ui/Primitives";
import { canEditSettings, getAdminGate } from "@/lib/admin-auth";
import { getLocations } from "@/lib/site-settings";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TrainerRow {
  id: string;
  name: string;
  role: string | null;
  specialism: string | null;
  location_id: string | null;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
}

/**
 * Content — coaches and imagery.
 *
 * Reads the BASE trainers table rather than the public view, so an admin sees
 * unpublished rows too. RLS allows that only for `is_admin()`.
 */
export default async function AdminContentPage() {
  const gate = await getAdminGate();
  if (gate.status !== "ok") return null;

  const supabase = await getServerSupabase();

  const [{ data: trainerRows }, { data: imageRows }] = supabase
    ? await Promise.all([
        supabase
          .from("trainers")
          .select("*")
          .order("display_order", { ascending: true }),
        supabase.from("site_images").select("slot, url, alt"),
      ])
    : [{ data: null }, { data: null }];

  const locations = await getLocations();

  return (
    <>
      <div className="mb-6">
        <Heading as="h1" size="sub" className="mb-2">
          Content
        </Heading>
        <p className="m-0 max-w-[70ch] text-[14px] leading-[1.65] text-muted">
          Coaches and the photography on the public site. A coach only appears
          once you publish them, so a half-filled row never goes live.
        </p>
      </div>

      <ContentBoard
        trainers={(trainerRows ?? []) as TrainerRow[]}
        images={(imageRows ?? []) as Array<{ slot: string; url: string | null; alt: string | null }>}
        locations={locations.map((l) => ({ id: l.id, name: l.short_name }))}
        canEdit={canEditSettings(gate.admin)}
      />
    </>
  );
}
