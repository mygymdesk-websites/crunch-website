-- ============================================================================
-- GENERATED FILE — DO NOT EDIT BY HAND.
--
-- Source: supabase/seed/locations.seed.json
-- Regenerate: npm run seed:generate
--
-- Idempotent: safe to run against a database that already has these rows.
-- ============================================================================

begin;

-- Drop the default flag first: it is backed by a partial unique index, so
-- moving the default between locations would otherwise collide mid-upsert.
update public.site_settings set is_default = false where is_default;

insert into public.site_settings (
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
  is_active,
  is_default,
  display_order,
  hero_image_url
) values
  (
    'vasant-kunj',
    'Crunch Fitness, Vasant Kunj',
    'Vasant Kunj',
    'Plot 4, Community Centre',
    'Vasant Kunj',
    'New Delhi',
    'Delhi',
    '110070',
    '5 min from Vasant Vihar metro · parking on site',
    '+919811024680',
    '+919811024680',
    'vasantkunj@crunchfitness.in',
    'Mon–Sun · 05:30 – 22:30',
    '[{"label":"Monday – Friday","value":"05:30 – 22:30"},{"label":"Saturday","value":"06:00 – 21:00"},{"label":"Sunday","value":"07:00 – 14:00"}]'::jsonb,
    'Closed on Holi, Diwali and Independence Day.',
    null,
    null,
    null,
    null,
    '{}'::jsonb,
    null,
    true,
    true,
    1,
    null
  ),
  (
    'gurgaon',
    'Crunch Fitness, Gurgaon',
    'Gurgaon',
    'SCO 12, Leisure Valley Road',
    'Sector 29',
    'Gurgaon',
    'Haryana',
    '122002',
    '3 min from IFFCO Chowk metro · basement parking',
    '+919872213570',
    '+919872213570',
    'gurgaon@crunchfitness.in',
    'Mon–Sun · 06:00 – 22:00',
    '[{"label":"Monday – Friday","value":"06:00 – 22:00"},{"label":"Saturday","value":"06:00 – 21:00"},{"label":"Sunday","value":"07:00 – 13:00"}]'::jsonb,
    'Closed on Holi, Diwali and Independence Day.',
    null,
    null,
    null,
    null,
    '{}'::jsonb,
    null,
    true,
    false,
    2,
    null
  )
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  address_line1 = excluded.address_line1,
  address_line2 = excluded.address_line2,
  city = excluded.city,
  state = excluded.state,
  postal_code = excluded.postal_code,
  transit_note = excluded.transit_note,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  email = excluded.email,
  hours_summary = excluded.hours_summary,
  hours = excluded.hours,
  closed_note = excluded.closed_note,
  map_embed_url = excluded.map_embed_url,
  map_link_url = excluded.map_link_url,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  socials = excluded.socials,
  mgd_location_id = excluded.mgd_location_id,
  is_active = excluded.is_active,
  is_default = excluded.is_default,
  display_order = excluded.display_order,
  hero_image_url = excluded.hero_image_url,
  updated_at = now();

commit;

-- ----------------------------------------------------------------------------
-- Admin bootstrap (run once, by hand, after creating the first auth user).
--
-- An admin_users row is what grants /admin access — an auth account alone is
-- not enough, and there is no INSERT policy for `authenticated`, so this has
-- to run with the service role (SQL editor or a server-side script).
--
--   insert into public.admin_users (id, email, full_name, role)
--   select id, email, 'Full Name', 'owner'
--   from auth.users
--   where email = 'admin@crunchfitness.in'
--   on conflict (id) do update
--     set role = excluded.role, is_active = true;
-- ----------------------------------------------------------------------------
