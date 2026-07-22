# Eveider

Pickup locker platform for DR Congo — businesses submit parcels, couriers deliver to lockers, customers collect with a PIN.

## Surfaces

| App | Path | Audience |
|-----|------|----------|
| Mobile | `apps/mobile-tenant` | Customers + couriers |
| Web manager | `apps/web-manager` | Admin + business dashboards, mobile APIs |

## Packages

| Package | Purpose |
|---------|---------|
| `@eveider/domain` | Business rules, parcel lifecycle, roles |
| `@eveider/api-contracts` | `ApiResult<T>`, Zod schemas |
| `@eveider/data-access` | PostgreSQL repositories (`pg`) |
| `@eveider/ui` | Shared React components |
| `@eveider/config-ui` | Design tokens (from design DNA) |
| `@eveider/config-eslint` | Shared ESLint config |
| `@eveider/config-typescript` | Shared TypeScript config |

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp .env.example .env
# Fill in publishable key, service role key, and DATABASE_URL password
```

Supabase CLI (link to hosted project):

```bash
supabase login
supabase link --project-ref clgcdbgnqqiosnijdbns
```

See [`docs/setup/supabase.md`](docs/setup/supabase.md) for full details.

## Scripts

```bash
pnpm dev          # web-manager (:3000)
pnpm dev:mobile   # mobile-tenant (Expo)
pnpm build        # Build all packages and apps
pnpm lint         # ESLint across workspace
pnpm typecheck    # TypeScript check
pnpm test         # Run tests
pnpm db:migrate   # Apply SQL migrations
pnpm db:seed      # Seed demo lockers
```

## Docs

Product and architecture blueprint: [`docs/blueprint/README.md`](docs/blueprint/README.md)
