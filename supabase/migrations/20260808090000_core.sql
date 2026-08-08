-- ============================================================================
-- Crunch Fitness website — core helpers
--
-- This Supabase project belongs to the client and holds WEBSITE concerns only:
-- site content, enquiry mirror, shop fulfilment mirror, shipments, admin auth.
-- Gym operations (members, classes, billing) stay in MyGymDesk.
--
-- House rules enforced across every migration in this folder:
--   1. RLS is enabled on every table.
--   2. Every table also gets EXPLICIT table-level GRANTs. RLS without GRANTs
--      fails silently — the policy never gets a chance to run because the role
--      has no privilege on the relation at all.
--   3. `anon` gets no privilege on any base table. Public reads go through a
--      column-scoped view; writes go through the service role in a route
--      handler.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Keeps `updated_at` honest without every writer having to remember it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at. SECURITY INVOKER on purpose — it
   touches only the NEW record, never reads another table.';
