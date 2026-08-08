-- ============================================================================
-- shop_orders / shop_order_items — the fulfilment mirror.
--
-- SCHEMA ONLY IN PHASE 1. Nothing writes here until Phase 5, when the MGD
-- `website-shop-order` endpoints exist. MyGymDesk records the sale, the stock
-- movement and the GST invoice; this table records what the *website* still
-- has to do about it — pack it, ship it, hand it over the counter.
--
-- Money is never computed here. Every amount is a snapshot of what MGD
-- resolved and Razorpay actually captured.
-- ============================================================================

create type public.fulfilment_type as enum ('pickup', 'courier');

create type public.shop_order_status as enum (
  'placed',
  'packed',
  'shipped',
  'delivered',
  'ready_for_pickup',
  'collected'
);

create table public.shop_orders (
  id                 uuid primary key default gen_random_uuid(),

  -- Human-facing reference, e.g. CF-S-2026-3391.
  order_number       text        not null,

  -- MyGymDesk + gateway references (the system of record for the money) -----
  mgd_sale_id        text,
  mgd_invoice_id     text,
  payment_gateway    text        not null default 'razorpay',
  payment_order_id   text,
  payment_capture_id text,

  -- Customer ----------------------------------------------------------------
  -- customer_user_id is set when the buyer signed in with OTP, and is what the
  -- "My Orders" policy matches on. Guest checkout leaves it null.
  customer_user_id   uuid references auth.users (id) on delete set null,
  customer_name      text        not null,
  customer_phone     text        not null,
  customer_email     text        not null,
  customer_gstin     text,

  -- Fulfilment --------------------------------------------------------------
  location_id        uuid references public.site_settings (id) on delete set null,
  location_slug      text,
  fulfilment         public.fulfilment_type   not null,
  status             public.shop_order_status not null default 'placed',
  -- { line1, line2, city, state, postal_code, country }
  shipping_address   jsonb,

  -- Amount snapshot, in rupees (major units) --------------------------------
  currency           text        not null default 'INR',
  subtotal           numeric(12, 2) not null default 0,
  discount_total     numeric(12, 2) not null default 0,
  shipping_total     numeric(12, 2) not null default 0,
  tax_total          numeric(12, 2) not null default 0,
  grand_total        numeric(12, 2) not null default 0,
  promo_code         text,

  notes              text,
  placed_at          timestamptz not null default now(),
  packed_at          timestamptz,
  dispatched_at      timestamptz,
  completed_at       timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- A courier order without an address cannot be fulfilled; guard it here so
  -- a half-written Phase 5 code path fails loudly instead of shipping to
  -- nowhere.
  constraint shop_orders_courier_needs_address
    check (fulfilment <> 'courier' or shipping_address is not null)
);

comment on table public.shop_orders is
  'Website-side fulfilment mirror of a MyGymDesk shop sale. SCHEMA ONLY until
   Phase 5. Amounts are snapshots of MGD/Razorpay figures, never recomputed.';

create unique index shop_orders_number_key on public.shop_orders (order_number);
create unique index shop_orders_capture_key
  on public.shop_orders (payment_capture_id) where payment_capture_id is not null;
create index shop_orders_customer_idx on public.shop_orders (customer_user_id, placed_at desc);
create index shop_orders_status_idx   on public.shop_orders (status, placed_at desc);
create index shop_orders_phone_idx    on public.shop_orders (customer_phone);

create trigger shop_orders_set_updated_at
  before update on public.shop_orders
  for each row execute function public.set_updated_at();

create table public.shop_order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.shop_orders (id) on delete cascade,

  -- Product identity as MGD reported it at time of sale.
  mgd_product_id text,
  sku            text,
  brand          text,
  name           text        not null,
  variant        text,
  image_url      text,

  quantity       integer     not null,
  unit_price     numeric(12, 2) not null,
  line_total     numeric(12, 2) not null,

  created_at     timestamptz not null default now(),

  constraint shop_order_items_qty_positive check (quantity > 0)
);

create index shop_order_items_order_idx on public.shop_order_items (order_id);

-- ----------------------------------------------------------------------------
-- Privileges + RLS
-- ----------------------------------------------------------------------------
alter table public.shop_orders      enable row level security;
alter table public.shop_order_items enable row level security;

revoke all on public.shop_orders      from anon, authenticated;
revoke all on public.shop_order_items from anon, authenticated;
grant select on public.shop_orders      to authenticated;
grant select on public.shop_order_items to authenticated;
grant all on public.shop_orders      to service_role;
grant all on public.shop_order_items to service_role;

create policy shop_orders_admin_read
  on public.shop_orders
  for select
  to authenticated
  using (public.is_admin());

-- "My Orders": a signed-in customer sees only rows tied to their auth user.
-- Matching on customer_user_id rather than email means a later email change
-- cannot hand someone else's order history to a new account.
create policy shop_orders_owner_read
  on public.shop_orders
  for select
  to authenticated
  using (customer_user_id is not null and customer_user_id = auth.uid());

create policy shop_order_items_admin_read
  on public.shop_order_items
  for select
  to authenticated
  using (public.is_admin());

create policy shop_order_items_owner_read
  on public.shop_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shop_orders o
      where o.id = shop_order_items.order_id
        and o.customer_user_id is not null
        and o.customer_user_id = auth.uid()
    )
  );
