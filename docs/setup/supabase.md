# Supabase Setup

Eveider uses Supabase for auth, PostgreSQL, and realtime.

## Project

| Setting | Value |
|---------|-------|
| Project ref | `clgcdbgnqqiosnijdbns` |
| API URL | `https://clgcdbgnqqiosnijdbns.supabase.co` |
| Key type | **Publishable** (not legacy anon) |

## Local environment

1. Copy root `.env.example` to `.env`
2. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase dashboard
3. Set database URLs from Supabase → **Settings → Database → Connection string**
   - **`DATABASE_URL` (app):** **Transaction pooler** — port `6543`, host `aws-…-pooler.supabase.com`
   - **`DIRECT_URL` (migrations):** **Direct connection** — port `5432`, host `db.<project-ref>.supabase.co`. Optional for the SQL migrate runner; use when pooler rejects DDL.
   - Optional: `PG_USE_SESSION_POOLER=1` to keep session pooler (`5432` on pooler host) instead of transaction pooler
4. Set `SUPABASE_SERVICE_ROLE_KEY` for server-only operations (never commit)

```bash
cp .env.example .env
```

## CLI setup

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase init          # already done in repo if supabase/ exists
supabase link --project-ref clgcdbgnqqiosnijdbns
```

## Database migrations

SQL migrations live in `db/migrations/`. See [`db/README.md`](../../db/README.md).

Ensure root `.env` has `DATABASE_URL` set. Migration scripts load `../../.env` from the monorepo root.

If migration fails with connection errors, check:
1. Supabase project is **not paused** (free-tier projects pause after inactivity — restore from the dashboard).
2. The database password is correct and **URL-encoded** if it contains special characters (`@`, `#`, `%`, etc.).
3. Host matches your dashboard (region pooler host can differ from `.env.example`).

```bash
# Apply pending SQL migrations
pnpm db:migrate

# Same as migrate (CI / production)
pnpm db:deploy

# Seed demo lockers (Kinshasa) — safe to re-run (upserts)
pnpm db:seed
```

Initial migration: `001_20260608193000_init.sql` — creates all core tables (users, businesses, parcels, lockers, etc.).

### Auth ↔ profiles

Supabase `auth.users` is separate from `public.users`. On signup, create a profile row with `authId` matching the Supabase user UUID and the chosen `role`.

## Related

- [ADR-001](../blueprint/decisions/ADR-001.md) — architecture
- Root `.env.example` — variable names
