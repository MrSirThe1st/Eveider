# Eveider

Pickup locker platform for DR Congo — businesses submit parcels, couriers deliver to lockers, customers collect with a PIN.

## Surfaces

| App | Path | Audience |
|-----|------|----------|
| Mobile | `apps/mobile` | Customers + couriers |
| Business portal | `apps/web-business` | Registered businesses |
| Admin dashboard | `apps/web-admin` | Eveider operations |

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
# Fill in Supabase and DATABASE_URL values
```

## Scripts

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all packages and apps
pnpm lint         # ESLint across workspace
pnpm typecheck    # TypeScript check
pnpm test         # Run tests
```

## Docs

Product and architecture blueprint: [`docs/blueprint/README.md`](docs/blueprint/README.md)
