-- ============================================================================
-- shipments — Shiprocket state for a courier order.
--
-- SCHEMA ONLY IN PHASE 1. Populated in Phase 5 when the order is pushed to
-- Shiprocket. Status arrives via Shiprocket's own webhook (with a poll
-- fallback); MyGymDesk has no outbound webhooks and is not involved here.
--
-- `status_log` keeps every raw payload we were sent, appended in order. When a
-- courier's status vocabulary changes — and it will — the parsed columns can be
-- rebuilt from the log instead of being lost.
-- ============================================================================

create type public.shipment_status as enum (
  'pending',        -- created on our side, not yet pushed to Shiprocket
  'created',        -- Shiprocket has the order
  'awb_assigned',
  'pickup_scheduled',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'rto_initiated',  -- return to origin
  'rto_delivered',
  'cancelled',
  'exception'
);

create table public.shipments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.shop_orders (id) on delete cascade,

  -- Shiprocket identifiers --------------------------------------------------
  shiprocket_order_id  text,
  shiprocket_shipment_id text,
  awb                  text,
  courier              text,
  tracking_url         text,
  label_url            text,
  manifest_url         text,

  status               public.shipment_status not null default 'pending',
  status_detail        text,

  -- Append-only history: [{ at, status, raw }] ------------------------------
  status_log           jsonb not null default '[]'::jsonb,

  shipped_at           timestamptz,
  delivered_at         timestamptz,
  expected_delivery_at date,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint shipments_status_log_is_array
    check (jsonb_typeof(status_log) = 'array')
);

comment on table public.shipments is
  'Shiprocket state per courier order. SCHEMA ONLY until Phase 5. status_log is
   append-only raw webhook payloads so parsed columns stay rebuildable.';

create unique index shipments_awb_key on public.shipments (awb) where awb is not null;
create index shipments_order_idx  on public.shipments (order_id);
create index shipments_status_idx on public.shipments (status, updated_at desc);

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Privileges + RLS
-- ----------------------------------------------------------------------------
alter table public.shipments enable row level security;

revoke all on public.shipments from anon, authenticated;
grant select on public.shipments to authenticated;
grant all on public.shipments to service_role;

create policy shipments_admin_read
  on public.shipments
  for select
  to authenticated
  using (public.is_admin());

-- A customer can track their own parcel.
create policy shipments_owner_read
  on public.shipments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shop_orders o
      where o.id = shipments.order_id
        and o.customer_user_id is not null
        and o.customer_user_id = auth.uid()
    )
  );
