-- ============================================================================
-- Per-location GSTIN.
--
-- The footer carried a hardcoded GSTIN lifted from the design mock — a
-- fabricated tax registration number on a real gym's website. It moves here,
-- defaults to NULL, and the footer renders nothing until a real one is set.
--
-- Per-LOCATION rather than per-company on purpose: GST registration in India
-- is state-wise, so a Delhi branch and a Haryana branch need separate GSTINs.
-- Modelling it once at company level would have been wrong the moment the
-- second branch opened.
-- ============================================================================

alter table public.site_settings
  add column if not exists gstin text;

comment on column public.site_settings.gstin is
  'State-wise GST registration number for this branch. NULL until the client
   supplies a real one — the footer renders nothing rather than a placeholder.';

-- 15 chars: 2 state code + 10 PAN + 1 entity + 1 'Z' + 1 checksum.
-- Enforced only when set, so the column can stay empty until it is known.
alter table public.site_settings
  drop constraint if exists site_settings_gstin_format;

alter table public.site_settings
  add constraint site_settings_gstin_format
  check (
    gstin is null
    or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
  );

-- Re-issue the public view with the new column appended.
drop view if exists public.site_settings_public;

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
    mgd_location_id,
    gstin,
    is_default,
    display_order,
    hero_image_url
  from public.site_settings
  where is_active;

comment on view public.site_settings_public is
  'Active locations, public columns only. Includes mgd_location_id (an opaque
   branch UUID, useless without the server-side API key) and gstin (a public
   registration number that must appear on invoices). Still omits is_active.';

grant select on public.site_settings_public to anon, authenticated, service_role;
