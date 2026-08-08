-- ============================================================================
-- admin_users — who may reach /admin, and with what role.
--
-- Keyed 1:1 to Supabase Auth. A row here is the ONLY thing that grants admin
-- access; having an auth account is not enough.
-- ============================================================================

create type public.admin_role as enum ('owner', 'manager', 'staff');

create table public.admin_users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text        not null,
  full_name    text,
  role         public.admin_role not null default 'staff',
  is_active    boolean     not null default true,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.admin_users is
  'Website admin roster. Rows are created by the service role only (Supabase
   dashboard or a server-side script) — there is deliberately no INSERT or
   UPDATE policy for `authenticated`, so a signed-in user cannot mint or
   escalate their own admin row.';

create unique index admin_users_email_key on public.admin_users (lower(email));
create index admin_users_active_idx on public.admin_users (is_active) where is_active;

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- is_admin() — the single gate every admin-only policy calls.
--
-- SECURITY DEFINER so it can read admin_users while the *caller* has no
-- privilege on that table. It takes no arguments and reads only auth.uid(),
-- so it cannot be pointed at another user's row.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active
  );
$$;

comment on function public.is_admin() is
  'True when the calling user has an active admin_users row. Returns false for
   anon. Used in RLS policies, so EXECUTE must stay granted to anon and
   authenticated — a missing EXECUTE inside a policy raises 42501 instead of
   returning zero rows.';

create or replace function public.admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select au.role
  from public.admin_users au
  where au.id = auth.uid()
    and au.is_active;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.admin_role() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.admin_role() to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Privileges + RLS
-- ----------------------------------------------------------------------------
alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;

-- A signed-in admin can see the roster (needed to render "who has access").
create policy admin_users_select_self_or_admin
  on public.admin_users
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- No INSERT / UPDATE / DELETE policies for `authenticated`, on purpose.
-- Roster changes are a service-role operation.
