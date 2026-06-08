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
3. For UI work, read `docs/blueprint/product/design-dna.md` and `brand.md` — French copy, RDC locale, no improvised visual styles.
4. If the task is ambiguous or touches schema, auth, packages, or large refactors → ask before proceeding.

## Standards (always enforced)

- TypeScript strict — `any` banned in non-trivial code
- Validate all external input at API boundaries with Zod
- Auth check on every protected server operation; enforce role scope (customer / courier / business / admin)
- Return `ApiResult<T>` — never raw DB or provider errors
- No DB or privileged service calls from client/UI code
- Reuse existing types, components, and logic before creating new

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
