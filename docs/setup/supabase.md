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
3. Set `DATABASE_URL` from Supabase → **Settings → Database → Connection string**
   - **Local dev (recommended):** **Session pooler** — port `5432`, host `aws-…-pooler.supabase.com`
   - **Serverless / edge:** Transaction pooler — port `6543` (Prisma adds `pgbouncer=true` automatically)
   - **Migrations only:** Direct connection (not for the running app)
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

Prisma schema lives in `packages/data-access/prisma/schema.prisma`.

Ensure root `.env` has `DATABASE_URL` (direct connection string from Supabase dashboard). Prisma commands load `../../.env` from the monorepo root automatically.

```bash
# Apply pending migrations (production / CI)
pnpm db:deploy

# Create new migration during development
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Seed demo lockers (Kinshasa) — safe to re-run (upserts)
pnpm db:seed
```

Initial migration: `20260608193000_init` — creates all core tables (users, businesses, parcels, lockers, etc.).

### Auth ↔ profiles

Supabase `auth.users` is separate from `public.users`. On signup, create a profile row with `authId` matching the Supabase user UUID and the chosen `role`.

## Related

- [ADR-001](../blueprint/decisions/ADR-001.md) — architecture
- Root `.env.example` — variable names
