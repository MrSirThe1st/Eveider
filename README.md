# Eveider

Pickup locker platform for DR Congo — businesses submit parcels, couriers deliver to lockers, customers collect with a PIN.

## Surfaces

| App | Path | Audience |
|-----|------|----------|
| Mobile | `apps/mobile` | Customers + couriers |
| Web portal | `apps/web-admin` | Landing, login, admin + business dashboards |
| ~~Business portal~~ | `apps/web-business` | Deprecated — redirects to web portal |

## Packages

| Package | Purpose |
|---------|---------|
| `@eveider/domain` | Business rules, parcel lifecycle, roles |
| `@eveider/api-contracts` | `ApiResult<T>`, Zod schemas |
| `@eveider/data-access` | Prisma client, repositories |
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
pnpm dev          # Unified portal (:3000) + mobile
pnpm build        # Build all packages and apps
pnpm lint         # ESLint across workspace
pnpm typecheck    # TypeScript check
pnpm test         # Run tests
pnpm db:deploy    # Apply Prisma migrations to Supabase
pnpm db:studio    # Open Prisma Studio
```

## Docs

Product and architecture blueprint: [`docs/blueprint/README.md`](docs/blueprint/README.md)
