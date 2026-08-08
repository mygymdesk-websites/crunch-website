-- ============================================================================
-- site_settings — THE location registry.
--
-- Locations are data, never code. Adding Faridkot (or any third gym) is:
--   1. insert a row here,
--   2. set mgd_location_id to that branch's MyGymDesk UUID,
-- and every location-aware surface on the site picks it up. No redesign, no
-- code change. (PRD §6.)
-- ============================================================================

create table public.site_settings (
  id                uuid primary key default gen_random_uuid(),

  -- Identity ----------------------------------------------------------------
  slug              text        not null,
  name              text        not null,   -- "Crunch Fitness, Vasant Kunj"
  short_name        text        not null,   -- "Vasant Kunj" (header pill, chips)

  -- Address -----------------------------------------------------------------
  address_line1     text        not null,
  address_line2     text,
  city              text        not null,
  state             text        not null,
  postal_code       text        not null,
  transit_note      text,                   -- "5 min from Vasant Vihar metro"

  -- Contact -----------------------------------------------------------------
  phone             text        not null,   -- E.164, e.g. +919811024680
  whatsapp          text,                   -- E.164; falls back to phone
  email             text        not null,

  -- Hours -------------------------------------------------------------------
  -- `hours_summary` is the one-line form used in the footer and header menu.
  -- `hours` is the per-day breakdown the Contact page renders, shaped
  -- [{ "label": "Monday – Friday", "value": "05:30 – 22:30" }, ...]
  hours_summary     text        not null,
  hours             jsonb       not null default '[]'::jsonb,
  closed_note       text,

  -- Map ---------------------------------------------------------------------
  map_embed_url     text,                   -- Google Maps embed src
  map_link_url      text,                   -- "Get directions" target
  latitude          numeric(9, 6),
  longitude         numeric(9, 6),

  -- Socials -----------------------------------------------------------------
  -- { "instagram": "https://…", "facebook": "https://…", "whatsapp": "https://…" }
  socials           jsonb       not null default '{}'::jsonb,

  -- MyGymDesk wiring (Phase 2+) ---------------------------------------------
  -- The branch UUID returned as `locationId` by the Website API. Null until
  -- the branch is configured in MGD; location-filtered API calls skip a
  -- location with no id rather than guessing.
  mgd_location_id   uuid,

  -- Presentation ------------------------------------------------------------
  is_active         boolean     not null default true,
  is_default        boolean     not null default false,
  display_order     integer     not null default 0,
  hero_image_url    text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint site_settings_slug_format
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  constraint site_settings_hours_is_array
    check (jsonb_typeof(hours) = 'array'),
  constraint site_settings_socials_is_object
    check (jsonb_typeof(socials) = 'object')
);

comment on table public.site_settings is
  'One row per gym location. Drives the header location selector, footer,
   contact cards, and every location-aware surface. Public-facing columns are
   exposed through public.site_settings_public.';

create unique index site_settings_slug_key on public.site_settings (slug);

-- At most one default location.
create unique index site_settings_one_default
  on public.site_settings ((true)) where is_default;

create index site_settings_active_order_idx
  on public.site_settings (display_order, short_name) where is_active;

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Privileges + RLS
--
-- Location details are public information (they are on the gym's front door),
-- but `anon` still gets NO privilege on the base table — otherwise a row-level
-- policy would expose every column, including internal wiring like
-- mgd_location_id. Public reads go through a column-scoped view instead.
-- ----------------------------------------------------------------------------
alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to authenticated;
grant all on public.site_settings to service_role;

create policy site_settings_admin_read
  on public.site_settings
  for select
  to authenticated
  using (public.is_admin());

create policy site_settings_admin_write
  on public.site_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy site_settings_admin_insert
  on public.site_settings
  for insert
  to authenticated
  with check (public.is_admin());

grant insert, update on public.site_settings to authenticated;

-- ----------------------------------------------------------------------------
-- The public projection.
--
-- security_invoker = false (the default) means this view runs as its owner, so
-- it reads the base table without needing to grant anon anything. The WHERE
-- clause is the access control, and the column list is the exposure boundary.
-- ----------------------------------------------------------------------------
create view public.site_settings_public
with (security_invoker = false)
as
  select
    id,
    slug,
    name,
    short_name,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    transit_note,
    phone,
    whatsapp,
    email,
    hours_summary,
    hours,
    closed_note,
    map_embed_url,
    map_link_url,
    latitude,
    longitude,
    socials,
    is_default,
    display_order,
    hero_image_url
  from public.site_settings
  where is_active;

comment on view public.site_settings_public is
  'Active locations, public columns only. Deliberately omits mgd_location_id
   and is_active. This is what the website reads with the anon key.';

grant select on public.site_settings_public to anon, authenticated, service_role;
