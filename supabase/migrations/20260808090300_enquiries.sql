-- ============================================================================
-- enquiries — a mirror of every lead the site sends to MyGymDesk.
--
-- MGD is the system of record for leads; the sales team works them in the CRM.
-- This table exists so the admin panel can show "what came in from the site"
-- without an MGD login, and so a lead is never lost if the MGD call fails.
--
-- Writes are server-side only (service role, from a route handler). There is
-- no INSERT grant for anon or authenticated — a public form posting straight
-- into a database table is how you get a spam table.
-- ============================================================================

create type public.enquiry_source as enum (
  'contact_form',
  'trial_modal',
  'appointment_form',
  'packages_enquiry',
  'other'
);

create type public.mgd_sync_status as enum (
  'pending',   -- not yet attempted (Phase 1: everything lands here)
  'sent',      -- MGD accepted it
  'failed',    -- MGD rejected or was unreachable; retryable
  'skipped'    -- deliberately not forwarded
);

create table public.enquiries (
  id             uuid primary key default gen_random_uuid(),

  -- Who ---------------------------------------------------------------------
  name           text        not null,
  phone          text        not null,      -- E.164, +91XXXXXXXXXX
  email          text,

  -- What --------------------------------------------------------------------
  interest       text,                      -- "Personal Training", "Group Classes"
  message        text,

  -- Where -------------------------------------------------------------------
  location_id    uuid references public.site_settings (id) on delete set null,
  location_slug  text,                      -- snapshot, survives a location delete
  source         public.enquiry_source not null default 'other',
  source_page    text,                      -- pathname the form was submitted from
  referer        text,

  -- Consent -----------------------------------------------------------------
  whatsapp_opt_in boolean    not null default true,

  -- MyGymDesk forwarding (wired in Phase 2) ---------------------------------
  mgd_sync_status public.mgd_sync_status not null default 'pending',
  mgd_lead_id     text,
  mgd_synced_at   timestamptz,
  mgd_error       text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint enquiries_name_len  check (char_length(btrim(name)) between 2 and 200),
  constraint enquiries_phone_len check (char_length(btrim(phone)) between 8 and 20)
);

comment on table public.enquiries is
  'Mirror of leads captured on the website. Insert-only from the server; the
   admin panel reads it. MyGymDesk remains the system of record.';

create index enquiries_created_idx  on public.enquiries (created_at desc);
create index enquiries_location_idx on public.enquiries (location_id, created_at desc);
create index enquiries_sync_idx     on public.enquiries (mgd_sync_status)
  where mgd_sync_status in ('pending', 'failed');
create index enquiries_phone_idx    on public.enquiries (phone);

create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Privileges + RLS
-- ----------------------------------------------------------------------------
alter table public.enquiries enable row level security;

revoke all on public.enquiries from anon, authenticated;
grant select on public.enquiries to authenticated;
grant all on public.enquiries to service_role;

-- Admins read. Nobody else, including the person who submitted it — enquiries
-- carry other people's names and phone numbers.
create policy enquiries_admin_read
  on public.enquiries
  for select
  to authenticated
  using (public.is_admin());
