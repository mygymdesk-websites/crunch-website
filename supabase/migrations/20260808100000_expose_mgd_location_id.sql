-- ============================================================================
-- Expose mgd_location_id on the public location view.
--
-- Phase 1 kept it out of `site_settings_public` on the reasoning that it was
-- "internal wiring". Phase 2 shows that reasoning was wrong on both counts:
--
--   1. It is needed on every render. Every display call to MyGymDesk is
--      location-filtered by this id, and those calls are made by the server
--      using the same anonymous read path as the rest of the page. Reading it
--      through the service role instead would mean a service-role client on
--      every public page render — a far bigger exposure than the id itself.
--
--   2. It is not a secret. It is an opaque branch UUID that grants nothing on
--      its own; the MyGymDesk API refuses every request without the API key,
--      which stays server-side. The key is the credential, not the id.
--
-- `is_active` stays out: that one really is presentation state the public has
-- no use for, and the view already filters on it.
-- ============================================================================

create or replace view public.site_settings_public
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
    is_default,
    display_order,
    hero_image_url
  from public.site_settings
  where is_active;

comment on view public.site_settings_public is
  'Active locations, public columns only. Includes mgd_location_id (an opaque
   branch UUID, useless without the server-side API key) because every
   location-filtered MyGymDesk read needs it. Still omits is_active.';

grant select on public.site_settings_public to anon, authenticated, service_role;
