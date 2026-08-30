# Eveider Agent Rules

## Product Scope

Eveider is a **pickup locker system** with four surfaces:

| Surface | Users | Purpose |
|---------|-------|---------|
| Mobile app | Customer + Courier (one app, role after login) | Track parcels, deliver to lockers, collect with PIN |
| Business web portal | Registered businesses | Register, submit parcels, track own shipments |
| Admin web dashboard | Eveider operations / management | Monitor, manage businesses, resolve issues |

### Core Entities

User, Business, Parcel, Locker, Compartment, Delivery, PickupPIN, Notification, Issue.

### Parcel Lifecycle

`Created` → `In transit` → `Delivered to locker` → `Ready for pickup` → `Collected`

### Role Scopes

- **Customer** — own parcels, PINs, notifications, support; read-only on locker availability where applicable.
- **Courier** — assigned deliveries, scan/drop-off, status updates, issue reporting; no admin or cross-courier data unless assigned.
- **Business** — register and manage own company profile; create parcels scoped to `businessId`; track own shipments; no PINs, couriers, lockers admin, or other businesses' data.
- **Admin** — full operational access: businesses, parcels, users, couriers, lockers, live monitoring, support, analytics.

Defer or reject work that does not advance business onboarding, parcel delivery, pickup, or operational visibility.

## Before Every Task

1. Read `docs/blueprint/templates/project-updates.md` first.
2. Read relevant product context in `docs/blueprint/product/` (start with `overview.md`; see `docs/blueprint/README.md` for the full index).
3. For UI work, read `docs/blueprint/product/design-dna.md` and `brand.md` — French copy (plain language, no KYC/COD/organisation jargon), RDC locale, no improvised visual styles. Verify with Cursor Browser when available, otherwise Playwright — see `docs/blueprint/ai/ui-verification.md`.
4. For data loading, new pages, new API routes, or new repository loaders, read `docs/blueprint/ai/data-fetching.md` and follow it strictly. That doc is the architecture: page-specific SQL, RSC lists, one auth profile lookup per request. Do not reuse `getOnboardingSummary` / `loadSummary` / `listActiveWithAvailability` just because they already exist.
5. If the task is ambiguous or touches schema, auth, packages, or large refactors → ask before proceeding.

## Standards (always enforced)

- TypeScript strict — `any` banned in non-trivial code
- Validate all external input at API boundaries with Zod
- Auth check on every protected server operation; enforce role scope (customer / courier / business / admin)
- Return `ApiResult<T>` — never raw DB or provider errors
- No DB or privileged service calls from client/UI code
- Reuse existing types, components, and logic before creating new
- **Reads:** async Server Component → `src/server/` use-case → repository method that returns only the fields that screen binds
- **Do not** load the full business onboarding graph, locker occupancy, or a second `findByAuthId` unless that screen/API actually uses the data
- Keep `supabase.auth.getUser()` for session validation; do not switch to `getSession()` without an auth review
- Do not set `allowExitOnIdle: true` on the Next.js `pg` pool; do not change production `idleTimeoutMillis` when tuning local performance

```ts
type ApiResult<T> = { success: true; data: T } | { success: false; error: string };
```

## Workflow

1. Read `docs/blueprint/templates/project-updates.md` + relevant product docs + code.
2. Implement the smallest working slice.
3. Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. Append to `docs/blueprint/templates/project-updates.md` if the change is meaningful.

## PR is blocked if

- Any check above fails
- Unvalidated external input exists
- A protected route lacks an auth check or role check
- `any` is introduced in non-trivial code
- A new list/detail page loads first paint with `useEffect` + `fetch` or a client query hook
- A page or API loader fetches unused domains (full `loadSummary`, locker availability on a name-only picker, documents/verifications on billing, etc.)
- The same request calls `findByAuthId` after `getCurrentUser()` / `resolveCurrentUser()` already returned `profile`
- Dev pool “fixes” change production idle timeout or re-enable `allowExitOnIdle` on the Next.js pool

## Minimum Test Coverage

- New API route: success, validation failure, auth failure, role-scope failure where applicable
- New business logic: happy path + at least one failure path
- Parcel status transitions: valid transition + invalid transition rejection

## Delivery Priority

1. **Auth & onboarding** — splash, login, register, OTP; role-based mobile shell (customer vs courier); business registration
2. **Business parcel submission** — register business → create parcel → business-scoped tracking
3. **Customer pickup flow** — home dashboard → parcel tracking → PIN screen → collected
4. **Courier delivery flow** — assigned deliveries → scan → locker drop-off → confirm
5. **Admin core** — dashboard overview, business management, parcel management, locker/compartment status
6. **Operations** — courier assignment, live delivery monitoring, issue reporting & resolution
7. **Notifications** — delivery updates, PIN delivery (SMS), pickup reminders, failure alerts
8. **Analytics (MVP)** — daily deliveries, pickup success rate, locker usage, top locations, volume by business
9. **Locker selection at business checkout** — map/list of locations with availability (when integrated)

## project-updates.md Format

Append-only. One entry per meaningful change. Keep entries concise.

```
## YYYY-MM-DD
- Type: DB | API | Frontend | Mobile | Infra | Other
- Description: what changed
- Impact: tables, routes, contracts, folders affected
- Tests: added | updated | deferred (reason)
```
