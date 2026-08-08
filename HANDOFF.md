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
