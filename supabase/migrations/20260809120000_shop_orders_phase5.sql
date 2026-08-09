-- ============================================================================
-- Phase 5 — what the mirror needs now that it actually receives orders.
--
-- Three changes:
--   1. `oversold` — MyGymDesk can confirm a paid order whose stock ran out
--      between create and pay. That is not a failure and is never auto-refunded;
--      it is a job for a human. The flag is what puts it in front of one.
--   2. `mgd_order_number` — the gym's own reference (FZ-…), which is what the
--      customer will quote on the phone. Distinct from our order_number.
--   3. An owner-read policy that also matches a VERIFIED email, so an order
--      placed as a guest becomes visible once that person signs in.
-- ============================================================================

alter table public.shop_orders
  add column if not exists oversold boolean not null default false;

comment on column public.shop_orders.oversold is
  'MyGymDesk reported stock ran out between order-create and payment. The order
   is paid and is NOT auto-refunded — the gym confirms availability before
   dispatch. Surfaced as a filter in admin.';

alter table public.shop_orders
  add column if not exists mgd_order_number text;

comment on column public.shop_orders.mgd_order_number is
  'The gym-side order reference (FZ-…) returned by website-shop-order-create.
   This is the number a customer will quote; ours is the website reference.';

create index if not exists shop_orders_oversold_idx
  on public.shop_orders (oversold, placed_at desc) where oversold;

-- ----------------------------------------------------------------------------
-- "My Orders" for guest checkout.
--
-- The original policy matched only customer_user_id, which is correct and
-- stays: it survives an email change. But it leaves a guest order invisible
-- forever, and most shop orders will be guest orders.
--
-- The email arm closes that. It compares against the JWT's email claim, not a
-- column the user controls, and Supabase only issues that claim for an address
-- the account has actually confirmed — so this grants sight of an order to
-- whoever proved they own the mailbox it was placed with. That is the same
-- standard the OTP sign-in already applies.
-- ----------------------------------------------------------------------------
drop policy if exists shop_orders_owner_read on public.shop_orders;

create policy shop_orders_owner_read
  on public.shop_orders
  for select
  to authenticated
  using (
    (customer_user_id is not null and customer_user_id = auth.uid())
    or (
      auth.jwt() ->> 'email' is not null
      and lower(customer_email) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists shop_order_items_owner_read on public.shop_order_items;

create policy shop_order_items_owner_read
  on public.shop_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shop_orders o
      where o.id = shop_order_items.order_id
        and (
          (o.customer_user_id is not null and o.customer_user_id = auth.uid())
          or (
            auth.jwt() ->> 'email' is not null
            and lower(o.customer_email) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

-- Shipments follow their order's visibility.
drop policy if exists shipments_owner_read on public.shipments;

create policy shipments_owner_read
  on public.shipments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shop_orders o
      where o.id = shipments.order_id
        and (
          (o.customer_user_id is not null and o.customer_user_id = auth.uid())
          or (
            auth.jwt() ->> 'email' is not null
            and lower(o.customer_email) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

-- ----------------------------------------------------------------------------
-- Admin writes. Reads were already admin-gated; status transitions need UPDATE.
-- Still no INSERT for authenticated: orders are written by the service role
-- from the confirm route, never by a browser.
-- ----------------------------------------------------------------------------
grant update on public.shop_orders to authenticated;

create policy shop_orders_admin_update
  on public.shop_orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy shipments_admin_update
  on public.shipments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update on public.shipments to authenticated;
