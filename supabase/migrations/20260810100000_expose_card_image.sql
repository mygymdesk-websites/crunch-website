-- ============================================================================
-- Expose card_image_url to the public view.
--
-- The column landed with the trainers migration but the anon-facing view was
-- never re-issued, so the location cards could not read it. DROP + CREATE
-- rather than CREATE OR REPLACE: replace can only append columns, and this
-- keeps the column order deliberate rather than append-driven.
-- ============================================================================

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
    hero_image_url,
    card_image_url
  from public.site_settings
  where is_active;

comment on view public.site_settings_public is
  'Active locations, public columns only. Includes mgd_location_id (an opaque
   branch UUID, useless without the server-side API key), gstin, and both
   images. Still omits is_active.';

grant select on public.site_settings_public to anon, authenticated, service_role;
