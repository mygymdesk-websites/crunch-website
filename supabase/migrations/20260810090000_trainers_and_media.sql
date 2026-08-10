-- ============================================================================
-- Trainers + admin-managed imagery.
--
-- The design draws a "Coaches on the floor" section and hero/gallery imagery.
-- Phase 3 emptied all of it because the copy asserted things about real people
-- and a real business that nobody had confirmed. The fix was never to delete
-- the sections — it was to give the client somewhere to put the truth. That is
-- what this adds.
--
-- Follows the site_settings pattern exactly: anon reads a column-scoped view,
-- never the base table; admins read and write the base table under is_admin().
-- ============================================================================

create table public.trainers (
  id            uuid primary key default gen_random_uuid(),

  name          text not null,
  -- Job title. Deliberately nullable: a name with no title is honest, a name
  -- with an invented title is not.
  role          text,
  specialism    text,

  -- Null means "all branches". A coach who floats is the common case and
  -- should not need a row per gym.
  location_id   uuid references public.site_settings (id) on delete set null,

  image_url     text,
  display_order integer not null default 0,

  -- Off by default. A trainer only appears on the live site once someone has
  -- looked at the row and turned it on.
  is_published  boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint trainers_name_not_blank check (length(btrim(name)) > 0)
);

comment on table public.trainers is
  'Coaching staff shown on the home and about pages. is_published is off by
   default so a half-filled row never reaches the public site.';

create index trainers_order_idx on public.trainers (display_order, name);

create trigger trainers_set_updated_at
  before update on public.trainers
  for each row execute function public.set_updated_at();

-- Public view: published rows, display columns only.
create view public.trainers_public
with (security_invoker = false)
as
  select id, name, role, specialism, location_id, image_url, display_order
  from public.trainers
  where is_published
  order by display_order, name;

comment on view public.trainers_public is
  'Published trainers only. Omits is_published and the timestamps.';

-- ----------------------------------------------------------------------------
-- Site-wide imagery, keyed by slot.
--
-- Per-LOCATION images already live on site_settings (hero_image_url). These are
-- the ones that belong to the site rather than to a gym: the homepage hero, the
-- about hero. A key/value table rather than columns, so adding a slot later is
-- a row and not a migration.
-- ----------------------------------------------------------------------------
create table public.site_images (
  slot       text primary key,
  url        text,
  -- Alt text is not optional for a real image; it is simply empty until
  -- someone uploads one.
  alt        text,
  updated_at timestamptz not null default now(),

  constraint site_images_slot_known
    check (slot in ('home_hero', 'about_hero'))
);

comment on table public.site_images is
  'Site-wide imagery by slot. Per-location imagery lives on site_settings.';

create trigger site_images_set_updated_at
  before update on public.site_images
  for each row execute function public.set_updated_at();

insert into public.site_images (slot, url, alt) values
  ('home_hero',  null, null),
  ('about_hero', null, null);

-- Per-location card image, distinct from the location's hero.
alter table public.site_settings
  add column if not exists card_image_url text;

comment on column public.site_settings.card_image_url is
  'Thumbnail for the location cards. Null renders the striped placeholder.';

-- ----------------------------------------------------------------------------
-- Privileges + RLS
-- ----------------------------------------------------------------------------
alter table public.trainers    enable row level security;
alter table public.site_images enable row level security;

revoke all on public.trainers    from anon, authenticated;
revoke all on public.site_images from anon, authenticated;

grant select on public.trainers_public to anon, authenticated, service_role;
grant select on public.site_images     to anon, authenticated;
grant all    on public.trainers        to service_role;
grant all    on public.site_images     to service_role;
grant select, insert, update, delete on public.trainers to authenticated;
grant update on public.site_images to authenticated;

create policy trainers_admin_all
  on public.trainers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Images are public by nature; only writing is gated.
create policy site_images_read
  on public.site_images
  for select
  to anon, authenticated
  using (true);

create policy site_images_admin_write
  on public.site_images
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Storage for uploads.
--
-- Public bucket: these are photos on a public marketing site, and a signed URL
-- for a picture of a squat rack buys nothing. Writes go through the service
-- role in a server action, so no browser ever holds a storage credential.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,  -- 5 MB; a hero photo has no business being larger
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy site_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'site-media');
