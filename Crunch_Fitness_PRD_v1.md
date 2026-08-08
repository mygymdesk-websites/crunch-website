# Crunch Fitness — Website Rebuild & MGD Integration
## PRD + Phase-wise Execution Plan · v1.1 · 8 Aug 2026
> v1.1: Blog + Gallery removed from scope (founder decision). SoW change to be reflected in a change note to client if v1.2 SoW is reissued.

---

## 1. Locked Decisions

| # | Decision |
|---|---|
| D1 | Shop + membership-purchase are built as **platform Website API endpoints** in MGD (all tenants benefit; documented in the public API guide) — not Crunch-specific hacks. |
| D2 | Website runs on a **completely separate Supabase project in the client's own account** (content, commerce fulfilment, admin, order-tracking auth). MGD Supabase is untouched by website concerns. |
| D3 | Locations: **Vasant Kunj + Gurgaon**. Faridkot joins later when it gets an MGD plan — site must be location-config-driven so adding it is config + MGD setup, zero redesign. |
| D4 | Design complete (Claude Design, all pages incl. checkout & policies) — implementation ports that design 1:1. |

## 2. Architecture

```
crunchfitness.in (Next.js on Vercel, client's account)
 ├─ Public pages (SSR/ISR — SEO requirement rules out SPA)
 ├─ /api/* route handlers  ← MGD API key lives HERE, server-side only
 │    ├─→ MGD Website API   https://db.mygymdesk.in/functions/v1/*
 │    ├─→ Client Supabase   (site content, orders mirror, shipments, admin, auth)
 │    └─→ Shiprocket API    (client's account)
 └─ /admin (same app, Supabase Auth + role gate)
```

**Two tracks, parallel from day one:**
- **Track A — MGD platform (Claude Code CLI, `mygymdesk-fresh`):** new Website API endpoints + WhatsApp notifications. Critical path for Phases 4–5.
- **Track B — Website (Claude Code CLI, new repo `crunch-website`):** everything on crunchfitness.in. Static + display + leads have **zero Track A dependency** and start immediately.

**Rules carried over:** all MGD calls via `db.mygymdesk.in`; API key never in browser JS; display endpoints cached server-side (ISR 15–30 min) so public traffic never touches the rate limit; timetable `id` re-fetched immediately before any booking (never cached).

## 3. Track A — MGD Platform Extensions (platform features)

> MGD-first discipline: audit existing POS sale flow, hosted signup page (`mygymdesk.in/{slug}`) purchase logic, and inventory schema BEFORE writing anything. Port, don't reinvent. All money endpoints follow the v1.1 pattern: order-first Razorpay, server-resolved amounts, gateway verification, capture-id idempotency (CAS + UNIQUE), no client-supplied amounts ever.

### A1. `GET website-products` — shop catalog
- From MGD inventory: id, name, brand, category, size/variant, price, listPrice (MRP strikethrough), stock, imageUrl, currency, locationId/locationName. `?location_id=` filter, `?category=` optional.
- Audit item: does inventory need a `published_to_website` flag (mirroring plans' publish-to-self-serve)? If yes, add column + toggle in owner UI.

### A2. `POST website-shop-order-create` + `POST website-shop-order`
- **Create:** `{items:[{product_id, qty}], location_id, customer}` → server resolves each price + stock check + GST from MGD data → Razorpay order. Returns `{order_id, amount(paise), currency, key_id}`.
- **Confirm (post-payment):** verifies capture on gym's gateway → atomically: stock decrement (reject if insufficient — race guard), MGD sale/invoice recorded (POS-style, shows in revenue reports), customer matched by phone or recorded as walk-in/member per existing POS semantics. `409 duplicate_payment` on replay. Returns order snapshot for the website to mirror.
- Failure semantics identical to booking endpoints: nothing written unless payment verifies.

### A3. `POST website-membership-order` + `POST website-membership-purchase`
- **Order:** `{plan_id, customer}` → server resolves plan price → Razorpay order.
- **Purchase:** verify capture → member created/matched by phone → subscription activated → GST invoice generated → WhatsApp receipt with Member App access (existing hosted-signup logic, exposed as API — port it, don't rebuild). Idempotent on capture_id.
- **Smoke gate (non-negotiable):** assert subscription row + invoice row + member access active — never HTTP 200 alone.

### A4. WhatsApp confirmations for API-originated events
- Today API leads/bookings send nothing. Add tenant-WhatsApp sends (existing MGD WA infra) for: class booking confirmed, membership purchased (invoice + app access), shop order confirmed. Lead capture → owner notification parity with hosted form.

### A5. Small platform fixes surfaced by this project
- Optional `location_id` on `capture-website-lead` (2-location gym; single-branch filing is a real gap).
- Raise Crunch key rate limit (default 30/hr → 300/hr) — config, not code.
- Update `website-api-integration.md` to v1.2 with all new endpoints.

## 4. Track B — Website (crunchfitness.in)

### B1. Stack
Next.js (App Router) + Tailwind, Vercel (client account or MGD-managed — confirm at kick-off), client's Supabase project. Domain + SSL on crunchfitness.in.

### B2. Client Supabase schema (website-only)
- `site_settings` (per-location contact/hours/socials — **locations as data, Faridkot = insert a row**)
- `enquiries` (mirror of every lead sent to MGD — powers admin "view enquiries")
- `shop_orders` + `shop_order_items` (fulfilment mirror: MGD sale ref, payment ref, fulfilment type pickup/courier, address, status: placed → packed → shipped → delivered / ready-for-pickup)
- `shipments` (Shiprocket order id, AWB, courier, tracking URL, status log)
- `admin_users` (Supabase Auth + role), customers use OTP sign-in for **order viewing only** (SoW: no member self-service on site — Member App callout instead)
- RLS on everything.

### B3. Pages (from completed design)
Home · About · Classes (catalog + weekly timetable, location-filtered, skeleton/empty/full states) · Packages · Shop · Product · Cart/Checkout · Contact · Policies (Refund, Guidelines, Terms, Privacy) · Sign In / My Orders · booking + trial modals.

### B4. Integration flows
- **Display:** plans / classes / sessions / products via server-cached proxy routes.
- **Free trial / enquiry →** `capture-website-lead` (+ mirror to `enquiries`). Honeypot + basic throttle on our side (API has no spam protection).
- **Class booking:** re-fetch session → `website-booking-order` → Razorpay Checkout → `website-class-booking` → success screen. Handle `slot_full`, `already_booked`, `session_not_bookable`, `duplicate_payment` explicitly.
- **Membership purchase:** A3 flow → success screen ("check WhatsApp for invoice + Member App").
- **Shop checkout:** A2 flow → on confirm, write `shop_orders` mirror → if courier: push to Shiprocket, store AWB, tracking link shown + WhatsApp'd.
- **Shiprocket:** server-side integration; status sync via Shiprocket webhook (preferred) with poll fallback.

### B5. Admin panel (`/admin`)
Orders list + detail (process, mark packed, generate Shiprocket shipment, print label, mark pickup-ready/collected) · Shipments tracking board · Enquiries list (read-only, "manage in MyGymDesk" link) · Site settings. Gym operations explicitly stay in MGD.

### B6. SEO migration
301 map from every legacy URL (crawl the old site first) → new routes · unique titles/meta · sitemap.xml + robots · GA4 · OG images · Search Console submission.

## 5. Phases

**Gate rule:** each money phase ends with smokes asserting downstream state in BOTH systems (MGD row + website mirror where applicable). No phase ships on HTTP 200.

| Phase | Track | Scope | Depends on |
|---|---|---|---|
| **0 · Kick-off gate** | — | All Section-7 client dependencies: legacy source+DB+hosting, brand assets, DNS, Razorpay + Shiprocket creds, MGD configured for BOTH locations (classes, plans published to self-serve, products+stock), API key generated + toggle ON + allowed origins set, rate limit raised, legacy URL crawl for 301 map. Client Supabase project created in their account. | Client |
| **1 · Foundations** (parallel) | B | Repo, Next.js scaffold, design system port, client Supabase schema + RLS, all static pages, policies, admin shell (settings + enquiries). | 0 |
| | A | Read-only audit: POS sale flow, hosted-signup purchase logic, inventory schema, WA send infra → endpoint specs locked. | 0 |
| **2 · Display + Leads** | B | Plans/classes/timetable/products display via cached proxies (products lands when A1 deploys), trial/enquiry forms live → MGD CRM + mirror, location selector wired. | 1, A1 |
| | A | A1 `website-products` + A5 (lead location_id, rate limit, docs). | 1-audit |
| **3 · Class booking** | B | Full booking flow against existing endpoints, all error states, success screens. | 2 |
| | A | A4 WhatsApp confirmations (bookings + leads). | 1-audit |
| **4 · Memberships** | A | A3 membership order+purchase endpoints + smoke gate. | 1-audit |
| | B | Packages purchase flow wired end-to-end. | A3 |
| **5 · Shop + fulfilment** | A | A2 shop order endpoints + smoke gate. | 1-audit |
| | B | Cart/checkout, order mirror, Shiprocket push + tracking, My Orders, admin order processing + labels. | A2 |
| **6 · Cutover** | B | SEO 301s live, sitemap/analytics, full UAT with named client staff, staff training (admin + MGD), legacy CSV export, DNS cutover, legacy decommission, 30-day support window starts. | 2–5 |

Sequencing intent: Phases 1–2 fill the SoW's "1 week" visible-progress expectation while A builds the money endpoints; 3–5 land in dependency order; UAT runs continuously per phase so Phase 6 is a cutover, not a test cycle.

## 6. Faridkot extension (future, out of current scope)
When Faridkot gets an MGD plan: add location in MGD (classes/plans/stock) → API responses include it automatically → insert `site_settings` row + contact content → location selector shows 3. No code changes if B is built config-driven (acceptance check in Phase 1).

## 7. Risks & flags

| Risk | Mitigation |
|---|---|
| Rate limit (30/hr shared) would die on public launch | Raised at Phase 0 + all display traffic server-cached; API hit ~once per endpoint per cache window regardless of traffic. |
| API bookings create **permanent active member records** (incl. one-off class drop-ins) | Told to client at kick-off — expected behaviour, in writing. |
| Class cancel → same-session re-book returns `409 already_booked` (known platform limitation) | Site shows honest message; platform fix tracked separately. |
| Timetable has no timezone/dated calendar | Site hard-codes IST; weekly-template UX already in design. |
| No MGD outbound webhooks | Website never depends on push from MGD; Shiprocket status via Shiprocket's own webhooks. |
| Client dependencies late | Timeline contractually starts only when Phase 0 gate passes (SoW §5/§7). |
| Legacy DB may be partly unrecoverable (site fatally broken) | SoW already scopes export as "where recoverable". |

## 8. Out of scope (per SoW §4)
Native apps (Brandable App programme) · refunds handling · couriers beyond Shiprocket · content creation · paid marketing/ongoing SEO · legacy PHP repair · gateways beyond Razorpay · non-English.
