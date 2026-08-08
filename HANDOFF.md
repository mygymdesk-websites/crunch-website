# Handoff

> ## Phase 2 — Live Display + Leads · MERGED to `main`
> Schema applied to the live client project, RLS + GRANTs verified at the
> database, and the enquiry mirror proven end-to-end (site → MyGymDesk →
> local `enquiries` → admin).
>
> **One blocker remains: `NEXT_PUBLIC_SUPABASE_URL` is still a raw
> `*.supabase.co` host** — Cloudflare DNS migration in progress. See
> [§0.1](#01-go-live-blocker--raw-supabase-url).
>
> **The gym has still published no content**, so every display surface renders
> its empty state. That is a client-config task, not a code one.

---

## 0.1 GO-LIVE BLOCKER — raw Supabase URL

`NEXT_PUBLIC_SUPABASE_URL` points at `bjwcsvpqplsgwkbbvehx.supabase.co`.
`npm run check:env` refuses it; the site runs on the documented local-dev hatch
(`ALLOW_RAW_SUPABASE_URL=true` in `.env.local`), which the check **ignores for
production builds** — so a production deploy will fail until the proxy is live.

Raw Supabase domains are ISP-blocked in parts of India, and this URL runs in
the visitor's browser (sign-in, admin, My Orders). Point the Cloudflare-proxied
domain at the project and swap the URL. Nothing else is needed.

---

## 0.2 Deferred items — completed 08/08/26

### Migrations applied to the live client project

All seven applied in order via `psql` against the session pooler, then
`seed.sql`. Output:

```
20260808090000_core.sql                    OK  (pgcrypto already existed)
20260808090100_admin_users.sql             OK
20260808090200_site_settings.sql           OK
20260808090300_enquiries.sql               OK
20260808090400_shop_orders.sql             OK
20260808090500_shipments.sql               OK
20260808100000_expose_mgd_location_id.sql  OK  (after the fix below)
seed.sql                                   OK
```

**One migration was broken and is now fixed.** `20260808100000` used
`CREATE OR REPLACE VIEW` to add `mgd_location_id` before `is_default`.
Postgres can only APPEND columns when replacing a view, so it read the change
as renaming `is_default` and refused:

> `ERROR: cannot change name of view column "is_default" to "mgd_location_id"`

Changed to `DROP VIEW` + `CREATE VIEW`, which keeps the column order logical.
Nothing but the app reads the view, and the migration re-issues the grant (a
dropped view takes its grants with it). This was only ever caught by running
it — the build could not have.

### RLS + GRANTs verified live

Structure, at the database:

| Object | Kind | RLS | Policies |
|---|---|---|---|
| `site_settings` | table | ✅ on | 3 |
| `enquiries` | table | ✅ on | 1 |
| `shop_orders` | table | ✅ on | 2 |
| `shop_order_items` | table | ✅ on | 2 |
| `shipments` | table | ✅ on | 2 |
| `admin_users` | table | ✅ on | 1 |
| `site_settings_public` | view | n/a | — |

Behaviour, over real PostgREST with the real keys:

- **anon has zero privilege on all six base tables** — every read returns
  `42501` (Supabase surfaces this as HTTP 401; read the body, not the status).
- **anon writes refused** — `INSERT enquiries` and `INSERT admin_users`
  (self-escalation) both `42501`.
- **anon reads the public view** — 200, 2 rows, **25 columns**, with
  `is_active`, `created_at` and `updated_at` all absent. `mgd_location_id`
  present, as intended by DECISION 15.
- **anon cannot reach the base table** behind the view — `42501`.
- **A signed-in NON-admin sees nothing** — `enquiries`, `site_settings` and
  `admin_users` all return 0 rows. Not an error: RLS filters them away.
- **A signed-in non-admin cannot escalate** — `INSERT admin_users` → `42501`;
  `PATCH site_settings` → **0 rows written** (`short_name` and `updated_at`
  both unchanged, verified directly — PostgREST answers `204` whether it
  updated a row or matched none, so the status alone proves nothing).
- **An admin CAN read and write** — reads `enquiries` / `site_settings` /
  `shop_orders`, and a `PATCH site_settings` returned 1 row with `updated_at`
  bumped. Worth proving explicitly: the Site Settings editor writes through
  the caller's session, so a broken UPDATE policy would have silently no-opped.

Both probe users were created and removed inside the check; the edited value
was restored.

### mgd_location_id mapping seeded

| slug | short_name | mgd_location_id | default |
|---|---|---|---|
| `vasant-kunj` | Vasant Kunj | `c53f2dc1-8889-46d7-8589-2f4c40119840` | ✅ |
| `gurgaon` | Gurgaon | `297b62e2-8fcf-4983-b9fd-12d358bc414d` | |

The build no longer logs `falling back to seed` — locations now come from the
database.

### Mirror proven end-to-end

One enquiry submitted through the site's own form path
(`/api/enquiries`, source `contact_form`, location `gurgaon`):

**Response:** `{"ok":true,"id":"26711a7c-…","lead_id":"def2ff6e-…","action":"created","location_name":"Crunch Fitness — Gurgaon","synced":true}`

**Local `enquiries` row:**

| column | value |
|---|---|
| `mgd_sync_status` | `sent` |
| `mgd_lead_id` | `def2ff6e-2d04-4d2c-bded-01ef38be3799` |
| `mgd_synced_at` | stamped |
| `mgd_error` | null |
| `location_slug` / `location_id` | `gurgaon` / FK set |

**MyGymDesk `leads` row:** same id, `status: new`, `source: website`, on
`location_id 297b62e2…` = **Crunch Fitness — Gurgaon**. Correct branch.

That row is readable by an admin JWT and invisible to a non-admin (both
verified above), which is the "visible in admin" gate.

### Test data cleaned up

- The two Phase 2 branch-routing leads (`ZZ WEBSITE TEST - DELETE ME` VK/GG)
  and the mirror-proof lead (`ZZ MIRROR PROOF - DELETE ME`) are **deleted from
  MyGymDesk**. The tenant is back to **0 leads**.
- Before deleting, I checked all 16 tables with an FK to `leads` — three of
  them `CASCADE` — and confirmed **zero dependent rows**, so the deletes
  touched nothing else.
- **Note:** the Website API is create-only for leads (all 8 endpoints; the doc
  itself says to delete from the dashboard), so this was done with scoped SQL
  against `tenant_id` + the exact ids, not through the API.
- **The local `enquiries` mirror row was deliberately KEPT** as the
  admin-visible evidence. Its `mgd_lead_id` now points at a deleted CRM lead —
  which is the mirror behaving exactly as designed (it survives independently
  so a lead is never lost). Delete it whenever you like; it is one row.

---

## 0. Phase 2 report (08/08/26)

### Gate re-check — cleared, except the database

| Gate item | State |
|---|---|
| `MGD_API_KEY` present | ✅ 41 chars, correct format |
| Key generated + active | ✅ active, 300/hr, tenant-wide (spans both branches) |
| `website-products` deployed | ✅ v1, 08/08 11:28 — Track A A1 shipped |
| Lead `location_id` param | ✅ `capture-website-lead` v113 — Track A A5 shipped |
| API doc v1.4 | ✅ on `origin/main` (my checkout was stale) |
| Supabase credentials present | ✅ all three |
| **Supabase schema applied** | ❌ **blocked — no DDL credential** |
| **Supabase URL proxied** | ❌ **raw `*.supabase.co` — GO-LIVE BLOCKER** |

### 🔴 Blocker 1 — the client's Supabase schema is not applied

The project (`bjwcsvpqplsgwkbbvehx`) is empty: none of the six tables or the
public view exist. `.env.local` has the service-role key, which grants
PostgREST access but **not DDL** — and the project is in the client's own
Supabase account, not one I can reach.

**One of these unblocks it:**

1. **You run it** — paste `supabase/migrations/*.sql` (in filename order) then
   `supabase/seed.sql` into the project's SQL Editor. Fastest.
2. **A Supabase personal access token** for the client's account in
   `.env.local` as `SUPABASE_ACCESS_TOKEN` — I can then apply it via the
   Management API.
3. **The database password** — I can then `supabase db push`.

Until then: the site runs on the checked-in location seed (which is why every
page still renders), and **enquiry mirroring is off** — leads reach MyGymDesk
but nothing is written locally, so the admin Enquiries list stays empty. The
code path is built and verified; it starts working the moment the tables exist.

### 🔴 Blocker 2 — Supabase URL is a raw `*.supabase.co` host

`NEXT_PUBLIC_SUPABASE_URL` points at `bjwcsvpqplsgwkbbvehx.supabase.co`.
`npm run check:env` refused it, and I proceeded on the documented local-dev
escape hatch (`ALLOW_RAW_SUPABASE_URL=true` in `.env.local`, which the check
ignores for production builds).

**This must not reach production.** Raw Supabase domains are ISP-blocked in
parts of India, and this URL runs in the visitor's browser — sign-in, the admin
panel and My Orders would silently fail for real customers. Point
`db.crunchfitness.in` (or similar) at the project through Cloudflare and swap
the URL.

### ⚠️ The gym has published nothing

Live-verified, at the API, just now — every endpoint answers `200` with an
empty list:

| Endpoint | Live result |
|---|---|
| `website-services?resource=plans` | `{"plans":[]}` — 4 plans exist, **0 published to self-serve** |
| `website-classes?resource=catalog` | `{"classes":[]}` — 0 class types |
| `website-classes?resource=sessions` | `{"sessions":[]}` — 0 scheduled |
| `website-services?resource=catalog` | `{"services":[]}` |
| `website-products` | `{"products":[],"currency":"INR",…}` — 0 published |

So **"live data renders" could not be demonstrated** — what I verified instead
is that every surface renders its designed empty state, correctly named per
branch, with no crash or blank. The moment the owner publishes, the pages fill
in with no code change.

To publish: membership plans need **Publish to self-serve** switching on
(Settings → the plan → publish), classes need types + a schedule, and shop
products need publishing to the website.

**Worth checking before publishing:** the four plans are Monthly ₹4,500 ·
Quarterly ₹10,000 · **Half Yearly ₹150,000** · Yearly ₹21,000. Half Yearly
being seven times Yearly looks like a slip for ₹15,000.

### ✅ Verified working

**Leads — live, both branches, confirmed at the database.** Two test leads
submitted through the site's own endpoint:

| Branch picked | MGD `lead_id` | `location_name` echoed back |
|---|---|---|
| Vasant Kunj | `4b0229fb-f13a-486f-8cc8-18d79cf10730` | Crunch Fitness — Vasant Kunj |
| Gurgaon | `c6c2bc88-0c2d-43ad-88c8-9355706627cb` | Crunch Fitness — Gurgaon |

Both confirmed in MyGymDesk's `leads` table on the correct `location_id`, with
`status: new`, `source: website`. **These are test rows named
"ZZ WEBSITE TEST - DELETE ME (VK/GG)" — please delete them from Leads →
Enquiries.** I left them rather than deleting from a live CRM myself; say the
word and I will.

**Caching — 10 rapid page loads consumed 0 API requests.** Measured against the
key's own `requests_this_hour` counter: it read 3 before and 3 after. Across
the whole verification run, 22 page loads cost 3 API calls. The shared hourly
budget is safe from public traffic.

**Failure injection — every surface degrades honestly.** Ran the built server
with a deliberately invalid key: all pages still returned `200`, each showed
its "briefly unavailable" state naming the real reason, and the server log
carried `[content] plans failed: 401 unauthorized` etc. No crash, no blank, no
stale-looking fake data.

**Regression:** build clean · 26/26 tests (up from 17) · 0 lint findings ·
`check:locations` green · **0px horizontal overflow across 11 routes at 360px
and 1440px** (22 measurements).

### Two defects live data exposed, both fixed

1. **A fabricated price.** The homepage read "Personal training from ₹800 a
   session" — a Phase 1 placeholder that became a false claim about a real
   gym's pricing the moment the site went live. It is now derived from the
   cheapest priced service package, and omitted entirely when none exists.
2. **Headings above nothing.** With an empty catalogue the homepage rendered
   "On the schedule at Vasant Kunj" and the Memberships band above empty grids.
   Both sections now hide when there is nothing to show — the Classes and
   Packages pages carry the explanatory empty states, which is where someone
   who went looking will be.

### API-shape notes for Track A

Reported as asked. Nothing here is a bug — these are places the contract and my
Phase 1 assumptions diverged, plus one caveat:

- **⚠️ The v1.4 shapes are implemented FROM THE DOC, not verified against live
  payloads.** Every endpoint returned an empty list, so `MgdProduct`,
  `stockByLocation`, per-row `currency` and the rest are untested against real
  data. First publish is the real test. This is the single biggest risk
  carried into Phase 3.
- `website-products` returns `category` as an **object** (`{id, name}`), not a
  string. My Phase 1 stub assumed a string; corrected.
- The products response carries `currency` / `locationId` / `locationName` at
  the **envelope** level as well as per row. Confirmed live: filtering by
  `location_id` echoes it back correctly
  (`locationName: "Crunch Fitness — Vasant Kunj"`).
- `mrp` is **omitted**, not null, when absent — presence must never be
  asserted. Handled via a `hasDiscount()` guard.
- `sport` is `""` when unset while services' `category` is `null`. The
  asymmetry is documented in 1.3 and now encoded in the types.
- `intervalLabel` can be the empty string; the pricing cards render the price
  alone rather than an empty suffix.
- **v1.3 removed member pricing**, and `is_member` + `booking_type=service` is
  now `422`. The client strips `is_member` for services rather than forwarding
  it — this closed a money bug where the order was minted at the member rate
  and the booking then failed on `amount_mismatch` after the customer had paid.
- MyGymDesk names the branches with an em dash ("Crunch Fitness — Vasant Kunj")
  while the website seed uses a comma. No conflict — the UUID is the join key —
  but the two will differ wherever MGD's own name is echoed, as in the lead
  confirmation.

### Design decisions this phase

**DECISION 15 — `mgd_location_id` is now exposed on the public location view.**
Phase 1 withheld it as "internal wiring". That was wrong on both counts: every
display call is filtered by it and made through the same anonymous read path,
so hiding it would have meant a service-role client on every public page render
— a far bigger exposure than an opaque branch UUID that grants nothing without
the API key. Migration `20260808100000_expose_mgd_location_id.sql`.

**DECISION 16 — the cart stores a snapshot, not a live product reference.**
Product data now comes from MyGymDesk, which only the server may call, and the
cart drawer renders on every page. Snapshotting name/price/size at add-time
avoids fetching the whole catalogue on every page view. Prices are display-only
and Phase 5 re-resolves every one server-side, so a stale snapshot can never
become the amount charged. Checkout reconciles against the live catalogue for
stock.

**DECISION 17 — product URLs are `name-size-<8 hex of id>`.** MyGymDesk has no
slug field and no variant engine (a size run is separate products), so name
alone is not unique. This is readable and collision-proof without scanning the
catalogue.

**DECISION 18 — PT packages are the `interval: "custom"` rows of
`resource=plans`.** This resolves the Phase 1 DECISION 6 question. Membership
plans bill on a calendar period; service packages are one-off blocks. If the
gym models PT as PT *plans* rather than service packages, the endpoint excludes
them and the section stays hidden — deliberately, with no fixture fallback.

**DECISION 19 — an enquiry succeeds if EITHER system took it.** The local
mirror is written first, then the MGD forward, then the outcome is stamped
back. A forwarding failure does not fail the request when the mirror is safe —
the enquiry genuinely was received — and vice versa. Only a double failure
returns an error. `mgd_sync_status` in the admin list is the queue of leads
that still need replaying; `Failed` renders as "Not in MGD" because that row is
then the only copy.

### Still owed

- Trainer photos: not provided, placeholders still render. Drop four JPGs into
  `public/images/trainers/` (`rahul-bisht`, `king-nash`, `harry-singh`,
  `abhishek-guha`) and they appear with no code change.
- `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` still empty — Phase 5.
- Policy copy still placeholder and not legally reviewed (Phase 1 gap, unchanged).
- Allowed Origins on the MGD key is empty. Correct while the site calls the API
  server-side only, which it does. It must be set before anything calls MGD
  from the browser.

---

## 0. Phase 2 gate report (08/08/26)

Ran the gate before touching any code. **Result: stop.** Evidence below — all of
it read-only, from the MyGymDesk database and the deployed function list.

### Blockers

**B1 — No credentials at all.** There is no `.env.local` in the repo. Neither
`MGD_API_KEY` nor any of the three Supabase variables is present, so the
migrations cannot be applied and the API cannot be called.

**B2 — The MyGymDesk API key has never been generated.** ⚠️ This is the one that
needs action, not just a paste. `tenant_website_api_keys` has **zero rows** for
the Crunch tenant (`af70dabd-bd5a-4734-aaeb-3548112ae1a9`). The Phase 0
dependency "API key generated + toggle ON + allowed origins set + rate limit
raised" has not been done. The owner must, in the MyGymDesk dashboard:

1. **Settings → Growth & Apps → Integrations → Website Lead Capture** (Pro plan —
   the tenant is on `pro`, so this screen is available).
2. Copy the key **immediately** — it is shown once and stored only as a hash.
3. **Toggle it ON.** New keys start inactive; every request 403s until it is on.
4. Allowed Origins — full origins *with scheme*, comma-separated:
   `https://crunchfitness.in, https://www.crunchfitness.in`
5. Raise Rate Limit from 30/hr to **300/hr** (it is one shared budget across all
   endpoints, not 30 each).

**B3 — `website-products` is not deployed.** The Phase 2 brief specifies the shop
grid and product detail read `GET /website-products` with `stockStatus`, `mrp`
and `?in_stock_only`. That endpoint does not exist on the platform — Track A
item **A1 has not shipped**. Deployed website-* functions are: `website-services`,
`website-classes`, `website-session-price`, `website-booking-order`,
`website-class-booking`, `website-service-booking`, `capture-website-lead`.
Absent: `website-products`, `website-shop-order`, `website-membership-order`,
`website-membership-purchase`.

**B4 — `capture-website-lead` has no per-request `location_id`.** The brief
specifies submitting "with the v1.4 `location_id` param (the user's selected
location)". The deployed function (v111, updated 06/08/26) files every lead
against the branch configured on the key:

```ts
location_id: keyRecord.location_id || null,
```

There is no request-body override. Track A item **A5 has not shipped**. Until it
does, all website leads land on ONE branch regardless of what the visitor picked
— they would have to be re-assigned by hand in the dashboard.

**B5 — There is no API doc v1.4.** `docs/website-api-integration.md` in
`mygymdesk-fresh` is still **v1.1 (2026-07-20)**. It contains no mention of
`website-products`, `stockStatus`, or a v1.2/1.3/1.4 changelog. The response
shapes the brief describes have no published contract to build against.

### Client-config gaps (independent of the above)

Even once B1–B5 clear, the tenant has almost nothing to display. Counts from the
live MyGymDesk database:

| Content | State | Effect on the site |
|---|---|---|
| `membership_plans` | 4 active, **0 published to self-serve** | `resource=plans` returns empty → Packages shows its empty state |
| `class_types` | **0** | Classes catalog empty |
| `class_sessions` | **0** | Weekly timetable empty at both branches |
| `products` | **0** | Shop empty even after A1 ships |
| `service_packages` | **0** | PT section hides (per brief, correctly) |

The four plans that exist (Monthly ₹4,500 · Quarterly ₹10,000 · Half Yearly
₹150,000 · Yearly ₹21,000) all have `is_published_self_serve = false`. Note
**Half Yearly at ₹150,000** looks like a data-entry slip for ₹15,000 — worth
checking before it is published. These prices also differ from the design's
placeholder pricing (₹2,500 / ₹6,500 / ₹24,000), which is expected — live data
wins — but the client should confirm the live figures are the ones to show.

### Recovered and ready (no guessing needed once unblocked)

| Thing | Value |
|---|---|
| Crunch tenant id | `af70dabd-bd5a-4734-aaeb-3548112ae1a9` (pro, active, approved) |
| Vasant Kunj `mgd_location_id` | `c53f2dc1-8889-46d7-8589-2f4c40119840` |
| Gurgaon `mgd_location_id` | `297b62e2-8fcf-4983-b9fd-12d358bc414d` |
| Old Gurgaon tenant | `bfaa0774-…` — **suspended**, merge looks correct |

MyGymDesk names the branches "Crunch Fitness — Vasant Kunj" (em dash); the
website seed uses "Crunch Fitness, Vasant Kunj" (comma). No conflict — the join
key is the UUID and the website name is display copy — but worth knowing they
differ.

### What was built while blocked

Only the guardrail the brief asked for as permanent tooling, because it needs to
exist *before* a URL is pasted, and it involves no guessing:

- **`npm run check:env`** (`scripts/check-env.mjs`), wired into `npm run verify`.
  Fails the build on a raw `*.supabase.co` URL, with `ALLOW_RAW_SUPABASE_URL=true`
  as a local-dev-only escape hatch that is ignored for production builds. Also
  fails on any server secret behind a `NEXT_PUBLIC_*` name, and on an
  `mgd_live_…` or service-role value pasted into a public variable.
  Verified across six cases: no-env, raw URL, raw URL + opt-out, raw URL +
  production, proxied domain, and a leaked key.
- `.env.example` documents the new vars, the key's once-only nature, and the
  proxied-domain requirement.

**Nothing else was touched.** `src/lib/content.ts` still returns fixtures, no
migrations were applied, and no MGD wiring was written.

### GO-LIVE BLOCKER

If the Cloudflare proxy for the client's Supabase project is not ready and local
dev proceeds on a raw `*.supabase.co` URL via `ALLOW_RAW_SUPABASE_URL=true`,
**that must not reach production.** `check:env` enforces it on production builds,
but the proxy still has to be set up before launch.

---

# Phase 1 — Foundations · Handoff

**Repo:** `crunch-website` · **Branch:** `main` · **Date:** 08/08/2026
**Scope:** PRD v1.1 §5, Phase 1 (Track B). Blog and Gallery deliberately out of
scope.

Everything below is either done, or named as not-done with the reason. Nothing
in this build can take a payment or write to MyGymDesk — those are Phases 3–5.

---

## 1. Status

### Done

| Area | State |
|---|---|
| Repo + Next.js 16 / React 19 / TypeScript / Tailwind v4 scaffold | ✅ |
| Design system ported to CSS variables + Tailwind theme tokens | ✅ |
| All 20 routes live, unique title + meta on each | ✅ |
| Client Supabase schema: 6 tables, RLS + explicit GRANTs, generated seed | ✅ written, ⏳ not applied |
| `lib/mgd/` typed server-only client, 17 unit tests, no network needed | ✅ |
| Header location selector, cookie-persisted, server-rendered | ✅ |
| Trial modal + contact + appointment + PT enquiry → `enquiries` | ✅ |
| Admin: OTP sign-in, `admin_users` gate, Site Settings editor, Enquiries list | ✅ |
| sitemap.xml, robots.txt, custom 404 | ✅ |
| `npm run verify` green (seed → location check → key check → typecheck → tests → build) | ✅ |

### Verified, not assumed

- `npm run build` — clean, 0 type errors, 20 routes.
- `npm run test` — 17/17 pass.
- `npm run lint` — 0 errors, 0 warnings.
- **Horizontal scroll:** measured `scrollWidth − clientWidth` on all 11 public
  routes at **360 px** and **1440 px**. Overflow was **0 px on all 22
  measurements.**
- **Theme:** `data-theme` server-rendered from the cookie on BOTH root layouts
  (site and admin), verified by HTTP with and without the cookie.
- **Location:** `cf.location=gurgaon` cookie verified to change server-rendered
  page content, not just client state.
- **Enquiry API:** honeypot → `200 {ok:true}` and dropped; bad phone / short
  name / bad email → `400` with the right code; valid submission with no
  Supabase → `503 not_configured` (an honest failure, not a fake success).
- **Admin gate:** `/admin` with no session returns the sign-in screen only — no
  admin markup is sent to the browser.

### Waiting on credentials (Phase 0 client dependencies)

| Blocked | Needs |
|---|---|
| Applying migrations + seed | Client's Supabase project URL + service-role key |
| First admin user | A Supabase Auth account, then the SQL at the bottom of `supabase/seed.sql` |
| Live MyGymDesk data (Phase 2) | `MGD_API_KEY`, toggle ON, allowed origins, rate limit raised to 300/hr |
| Shiprocket (Phase 5) | `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` |
| Real brand assets | Final logo, palette, photography |

Nothing was applied to any database — no Supabase credentials exist in this
environment. The migrations and `seed.sql` are ready to apply as-is.

---

## 2. `DECISION:` items

Judgement calls made to keep moving. Each is reversible; flag any you disagree
with.

**DECISION 1 — My Account is sign-in + orders only.**
The design draws a full member dashboard (Overview / Bookings / Profile tabs
with membership status, class bookings, freeze, notification prefs). SoW §B2 is
explicit that the website does **no member self-service** — that is the Member
App's job — and that customers sign in "for order viewing only". I built sign-in
+ My Orders + the Member App callout, and did not build the other three tabs.
*If the client expects the full dashboard, that is a scope change against the
SoW, not a bug.*

**DECISION 2 — Auth is email OTP, not the design's password login.**
A password form means storing another credential for people who already have one
in the Member App. Supabase OTP avoids that. Same card, same design language.

**DECISION 3 — Product detail page was designed, not ported.**
The shop cards in the export link to `Crunch Fitness Product.dc.html`, which was
never drawn. I assembled `/shop/[slug]` strictly from documented design-system
patterns (same badges, price treatment, stock states, two-column inner-page
layout). Nothing visual was invented, but this page has not been through design
review.

**DECISION 4 — About keeps its photo strip; the "See full gallery" link is gone.**
Gallery is out of scope, so a link to a page that will never exist was removed.
The inline "A look around" strip is part of the About layout and stayed.

**DECISION 5 — `shop_order_status` has exactly the six values specified.**
`placed / packed / shipped / delivered / ready_for_pickup / collected`. The
design's My Orders screen shows a **"Refunded"** chip, which has no enum value.
Phase 5 will need `ALTER TYPE ... ADD VALUE 'refunded'` (and probably
`cancelled`). Called out rather than silently added.

**DECISION 6 — ⚠️ PT packages may have no API source.**
The design has a Personal Training section on /packages. The API doc is explicit
that `website-services?resource=plans` returns membership plans and *service
packages* only — **"PT plans and class packages are not included."** Phase 2 must
confirm the gym models PT blocks as *service packages* in MyGymDesk. If they are
modelled as PT plans, this section has **no data source** and needs a Track A
change. This is the single most likely Phase 2 surprise.

**DECISION 7 — The 1220 px header breakpoint is CSS, not `matchMedia`.**
The export switches to the hamburger with JS because a design tool has no
stylesheet to put a media query in. Same breakpoint, same rendering, but no
server/client mismatch and no layout jump on first paint.

**DECISION 8 — Footer band unified to `--surface2`.**
Seven of the eight exported pages use `surface2`; Home uses `surface`. Treated
as an inconsistency in the export and normalised to the majority, which also
preserves the documented alternating-band rhythm.

**DECISION 9 — Cart badge is hidden at zero.**
The design hardcodes "2" and never depicts an empty cart. A badge reading "0" is
worse than no badge.

**DECISION 10 — Social icons with no URL render as non-links.**
The export uses `href="#"`, which scrolls the visitor to the top. Until the
client's handles are entered in the admin panel, the IG/FB/WA circles render as
inert marks — visually identical at rest.

**DECISION 11 — Theme preference is a cookie, server-rendered.**
Originally an inline pre-paint script, per the export. React 19 hoists inline
`<script>` tags and it silently stopped applying on the admin root layout —
caught by running the built server, not by the build. A cookie read in both root
layouts gives zero flash, zero hydration mismatch, and no script at all.

**DECISION 12 — Checkout cannot take money, and says so.**
The pay button is disabled and reads *"Pay ₹X — launching soon"*, with the desk's
phone number underneath. The alternative — a realistic-looking Razorpay flow that
does nothing — is the worst possible thing to ship on a gym's own site.

**DECISION 13 — Class "Book" opens the trial modal.**
Real booking needs a session `id` re-fetched immediately beforehand (the id rolls
forward as occurrences pass) and a live payment. That is Phase 3. Rather than
fake it, the button captures a lead against that class.

**DECISION 14 — The site renders per-request, not statically.**
The location cookie is read in the root layout, so every page is dynamic. This is
correct — content genuinely varies by gym, and the MyGymDesk rate limit is still
protected by the 15-minute server-side fetch cache, which is independent of page
rendering. If TTFB becomes a Phase 6 concern, the lever is moving location into
the URL, not removing the cookie.

---

## 3. Known gaps

**⚠️ Policy copy is placeholder and has NOT been legally reviewed.**
`src/content/policies.ts` carries the design's placeholder text for all four
documents. It reads correctly and is structurally complete, but it is not legal
advice and must be reviewed or replaced by the client's lawyer before launch.
The GSTIN in the footer (`07AABCU9603R1ZX`) also came from the design mock and
needs confirming.

**Trainer photos are missing.**
The four real photos live in the Claude Design project under `uploads/`. Each
exceeds the design-sync tool's 256 KiB read cap and came back truncated, so I
did not ship corrupt files. The striped placeholder renders in the meantime.
Download them by hand into `public/images/trainers/` as
`rahul-bisht.jpg`, `king-nash.jpg`, `harry-singh.jpg`, `abhishek-guha.jpg` and
they appear with no code change.

**Photography is Unsplash stand-in.** Every gym/class/product image is a
placeholder pending the client's shoot. `CoverImage` uses a plain `<img>`
deliberately; swap it for `next/image` when the real assets land and are being
served from a known host.

**Social URLs, map embeds and `mgd_location_id` are empty in the seed.** All
three are admin-panel fields; the site degrades honestly without them (striped
map placeholder, inert social marks, unfiltered API reads).

---

## 4. Phase 2 readiness checklist

Phase 2 is *Display + Leads*. The work is deliberately concentrated in two files.

- [ ] **Apply the schema.** `supabase db push`, then `seed.sql`, then create the
      first `admin_users` row.
- [ ] **Set env.** `MGD_API_BASE`, `MGD_API_KEY`, the three Supabase vars.
- [ ] **Confirm the MGD key is live:** toggle ON, allowed origins set to
      `https://crunchfitness.in` and `https://www.crunchfitness.in`, rate limit
      raised from 30/hr to 300/hr.
- [ ] **Fill in `mgd_location_id` for both gyms** in `/admin`. Get the UUIDs from
      the `locationId` values in an unfiltered API response. Until set, reads are
      unfiltered rather than guessed.
- [ ] **Swap the data source.** `src/lib/content.ts` — every function is a
      one-line change to the matching `mgd()` call; the signatures, types and all
      downstream components already match. Flip `IS_LIVE_DATA` to `true`.
- [ ] **Turn on the lead forward.** `src/app/api/enquiries/route.ts` has the
      commented block ready: mirror first, then forward, then stamp
      `mgd_sync_status`. Never fail the request on an MGD error — the row is
      already saved and replayable.
- [ ] **Resolve DECISION 6** (PT packages source) before wiring /packages.
- [ ] **Products land when Track A ships A1** (`website-products`).
      `mgd().getProducts()` throws `MgdNotYetLiveError` today; uncomment the
      request line in `src/lib/mgd/api.ts`.
- [ ] **Re-run `npm run verify`** and re-measure 360 px overflow after wiring —
      live data has longer names than fixtures.

### Already true, so Phase 2 does not have to build it

- Location filtering threads through `mgd_location_id` everywhere.
- Loading skeletons, empty states and the full-slot state are built and reachable
  via Suspense boundaries — a slow MGD call shows the shimmer, a branch with no
  published schedule shows the empty state.
- The `fresh: true` argument is already threaded through `getClassSessions`, so
  Phase 3 booking gets an uncached session id without a refactor.
- Every documented error code has customer-facing copy in `humanizeMgdError()`.
- `MGD_TAGS` cache tags exist for targeted invalidation.

---

## 5. Files worth knowing

| File | Why |
|---|---|
| `src/lib/content.ts` | **The Phase 2 swap point.** Fixtures today, MGD tomorrow. |
| `src/lib/mgd/api.ts` | One method per endpoint, incl. typed Phase 4–5 stubs. |
| `src/lib/mgd/types.ts` | Response types, with the contract's quirks encoded. |
| `supabase/seed/locations.seed.json` | **The only place location data is written down.** |
| `scripts/check-hardcoded-locations.mjs` | Enforces that, in CI. |
| `scripts/check-mgd-key-isolation.mjs` | Enforces the key never reaching the browser. |
| `src/content/policies.ts` | Legal copy — placeholder, needs review. |
| `design-export/` | Verbatim Claude Design export, kept so the port can be diffed against its source. |

## 6. Adding the third gym (Faridkot)

The acceptance test for "locations are data":

1. Add an object to `supabase/seed/locations.seed.json`.
2. `npm run seed:generate` → apply, or insert the row directly.
3. Set `mgd_location_id` in `/admin` once the branch exists in MyGymDesk.

The header selector, footer, contact cards, location picker, page titles and
enquiry routing all pick it up. `npm run check:locations` guarantees no code
change is needed.
