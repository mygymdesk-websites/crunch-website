# crunchfitness.in

Website rebuild for Crunch Fitness — an independent Indian gym chain with two
locations. Next.js (App Router) on Vercel, the client's own Supabase project for
website data, and the MyGymDesk Website API for everything gym-side.

**Phase 1 (Foundations) is what is in here.** See [HANDOFF.md](./HANDOFF.md) for
what is done, what is waiting on credentials, and the Phase 2 checklist.

---

## Run it

```bash
npm install
cp .env.example .env.local     # fill in what you have; the site boots without any of it
npm run dev                    # http://localhost:3000
```

With no credentials the site still builds and renders: locations fall back to
the checked-in seed, and every MyGymDesk read degrades to an empty result so
each page shows its designed empty state rather than crashing.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit tests (MyGymDesk client, no network needed) |
| `npm run lint` | ESLint |
| `npm run seed:generate` | Regenerate `supabase/seed.sql` from the location seed |
| `npm run check:locations` | Fail if a location name leaked into code |
| `npm run check:mgd-key` | Fail if the MGD key could reach the browser |
| `npm run check:env` | Fail on a raw `*.supabase.co` URL, or a secret in a `NEXT_PUBLIC_` var |
| `npm run verify` | All of the above, in order |

## How it is put together

```
src/
  app/
    (site)/          public site — its own root layout, header/footer/cart/trial modal
    (admin)/admin/   admin panel — separate root layout, no marketing chrome
    api/enquiries/   lead capture (server-side write, service role)
  components/        UI primitives + per-page components
  lib/
    mgd/             typed MyGymDesk Website API client (server-only)
    supabase/        browser / server / service-role clients
    content.ts       ← the data source: LIVE MyGymDesk API (v1.4) since Phase 2
    site-settings.ts location registry (server-only)
supabase/
  migrations/        schema, RLS + explicit GRANTs
  seed/              THE canonical location data
  seed.sql           generated from the above
design-export/       verbatim Claude Design export, for diffing the port
```

### Three rules the code holds to

**Locations are data.** Nothing in `src/` knows where the gyms are — it knows
there are rows in `site_settings`. Adding a third gym is an INSERT plus a
MyGymDesk branch id. `npm run check:locations` fails the build if a location
name, address or phone appears anywhere outside the seed.

**The MyGymDesk key never reaches the browser.** `lib/mgd/` is `server-only`,
the key is read from `MGD_API_KEY`, and it goes out in an `x-mgd-api-key`
header — never a query string. `npm run check:mgd-key` enforces it.

**Display reads are cached.** Every MyGymDesk endpoint shares ONE hourly budget
per key, so public traffic is served from a 15-minute server cache rather than
mapped 1:1 onto API calls. The one exception is a timetable read taken
immediately before a booking, which must be fresh — a session `id` is the next
real occurrence and rolls forward as occurrences pass.

## Database

Migrations are in `supabase/migrations/`, applied in filename order. Every table
has RLS **and** explicit table-level GRANTs — RLS without GRANTs fails silently,
because the role never gets a privilege on the relation for the policy to
filter.

```bash
supabase link --project-ref <ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Then create the first admin: see the commented block at the bottom of
`supabase/seed.sql`.
