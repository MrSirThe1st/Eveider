# Data Fetching Patterns

**Mandatory for every new or changed screen in `web-manager`.**  
Do not invent a parallel pattern. If a screen needs something outside this doc, document it as a named exception in the PR.

This doc is the architecture that keeps dashboard navigation fast. The 2026-08-21 regression (full onboarding graph + locker availability + duplicate `findByAuthId` + client `useEffect` lists) must not be reintroduced.

## One architecture

```
Navigation (read)
  → async Server Component page.tsx
  → getCurrentUser() / getAdminSession() / requireBusinessPageContext()   [React.cache(), once per request]
  → page-specific use-case in apps/web-manager/src/server/*
  → packages/data-access repository method that returns only this screen’s data
  → pass serializable props to *Panel / *View / *List (client)
  → loading.tsx → skeleton from @eveider/ui

Mutations (write)
  → client component
  → POST/PATCH/DELETE /api/*  (thin wrapper around the same use-case)
  → router.refresh()  (± invalidateQueries for live boards)

Live / heavy client filters (exceptions only)
  → documented hook + /api/*
  → LoadingSpinner for waits — never inline “Chargement…” text
```

### Rules (non-negotiable)

1. **Every new list/detail page** loads data on the server. No `useEffect` + `fetch` for first paint. No client query hook for initial list load.
2. **Every route that awaits data** has a sibling `loading.tsx` using a skeleton from `@eveider/ui`.
3. **Loading UI** uses `@eveider/ui` only: `LoadingSpinner`, `TableSkeleton`, `CardListSkeleton`, `DashboardOverviewSkeleton`. Never a bare `<p>Chargement…</p>` or a per-page “Rafraîchir” button.
4. **Use-cases** live in `src/server/` and are shared by the page and the matching API route when the API exists.
5. **Client refetch** is allowed only for: mutations/cache helpers, live auto-refresh boards, debounced server-side search that cannot be done in memory. Status chips and search over an already-loaded array must filter **in memory**, not refetch.
6. **Load only what the screen renders.** Do not reuse a “full graph” loader because it is convenient. Add a page-specific repository method (one SQL or a tight JOIN/`json_agg`) instead of fan-out `Promise.all` of unrelated tables.
7. **One profile lookup per request.** If `getCurrentUser()` / `resolveCurrentUser()` already returned `profile`, do not call `findByAuthId` again. `React.cache()` is **per HTTP request** — an API route does not share the RSC cache.

---

## Load only what the page needs

Postgres is remote (Supabase pooler). Each round trip is expensive (~200–300ms warm, ~2s on a new TLS connection). Fan-out is the usual cause of 4–7s dashboard pages.

| Screen needs | Loader | Do not call |
|--------------|--------|-------------|
| Name, status, analytics | `loadBusinessDashboard` → `businesses.findById` + `stats.getBusinessAnalytics` | `getOnboardingSummary` |
| Settings form + dropoff picker | `loadBusinessSettingsPageData` → `getSettingsSnapshot` + `listActivePickerOptions` | `getOnboardingSummary`, `listActiveWithAvailability` |
| Billing / settlement / limits | `loadBusinessBillingPageData` → `getBillingSnapshot` | lockers, documents, verifications, users |
| Onboarding wizard / admin dossier | `getOnboardingSummary` (`loadSummary`) | — this is the only full-graph reader |
| Locker map / Points / parcel destination with capacity | `listActiveWithAvailability` / `listNetworkDirectory` | — |
| Business Colis list (location) | `listBusinessColis` → pickup type + latest delivery, then `resolveBusinessParcelLocation` | `listForBusiness` full graph |
| Business Colis detail | `findForBusiness` + derived location/progression | `useEffect` + `GET /api/entreprise/parcels/:id` for first paint |
| Dropoff `<select>` of name+address | `listActivePickerOptions` | availability aggregates |

`getOnboardingSummary` / `loadSummary` loads business + users + locations + documents + billing + settlement + permissions + limits + history + verification + checks + reviewer. That is correct for the KYC wizard and admin application review. It is **wrong** for dashboard home, Paramètres, Facturation, Colis, Incidents, or any new settings-like page.

When adding a screen, list the fields the UI binds, then write a snapshot query that returns those fields. Copy `getSettingsSnapshot` / `getBillingSnapshot` / `listActivePickerOptions`, do not extend `loadSummary`.

### Repository shape

```ts
// ✅ page-specific, one round trip
async getBillingSnapshot(businessId: string) { /* JOIN billing + settlement + limits */ }

// ❌ convenience fan-out reused by unrelated pages
async getOnboardingSummary(businessId: string) { /* 12 queries, always */ }
```

Prefer one SQL with `LEFT JOIN` / `json_agg` over `Promise.all` of many `SELECT *`. Independent `Promise.all` is fine for **two truly separate** aggregates (e.g. business row + analytics) that the page both displays.

---

## Auth lookups

Keep **`supabase.auth.getUser()`** for session validation. Do not switch RSC or API handlers to `getSession()` unless a dedicated auth review says it is safe for this codebase.

| Layer | What it may do | What it must not do |
|-------|----------------|---------------------|
| Middleware | `getUser()` when a session cookie exists (no Postgres) | Profile SQL |
| RSC layout/page | `getCurrentUser()` (`React.cache` → `getUser` + `findByAuthId`) | A second `findByAuthId` |
| Cookie API route | `resolveCurrentUser()` and **use `current.profile`** | `onboarding.findProfileByAuthId` after that |
| Bearer API route | `getUser(token)` then **one** `findByAuthId` | Two profile queries |

Reference: `apps/web-manager/src/app/api/auth/me/route.ts`, `lib/auth/get-current-user.ts`.

---

## Server use-case layer

```
apps/web-manager/src/server/
  session.ts                 # getAdminSession / getBusinessSession (cache)
  business.ts                # page-specific business loaders (not the full KYC graph)
  parcels.ts                 # listBusinessParcels, loadBusinessParcelDetail
  issues.ts                  # listIssues / listBusinessIssues
  lockers.ts
  dashboard.ts               # admin home
  …
```

Example:

```ts
// server/lockers.ts — called by page AND GET /api/lockers
export async function listLockers(ctx: DataAccessContext) {
  const { lockers } = createRepositories();
  return (await lockers.listAll(ctx)).map(toLockerSummaryDto);
}
```

---

## Page pattern (copy this)

```tsx
import { PageFrame, TableSkeleton } from '@eveider/ui'; // loading.tsx uses skeleton
import { ThingList } from '@/components/thing-list';
import { listThings } from '@/server/things';
import { getAdminSession } from '@/server/session';

export default async function ThingsPage() {
  const { ctx } = await getAdminSession();
  const things = await listThings(ctx);
  return (
    <PageFrame title="…" layout="wide">
      <ThingList things={things} />
    </PageFrame>
  );
}
```

```tsx
// loading.tsx
import { TableSkeleton } from '@eveider/ui';
export default function ThingsLoading() {
  return <TableSkeleton />;
}
```

Client panel receives props; mutations call `/api/*` then `router.refresh()`. Status/search filter the **props array** with `useMemo` + `matchesListSearch`.

---

## Loading UI map

| Situation | Component |
|-----------|-----------|
| Route navigation (RSC) | `loading.tsx` + skeleton |
| Table / list shape | `TableSkeleton` |
| Card dossiers | `CardListSkeleton` |
| Dashboard home | `DashboardOverviewSkeleton` |
| Mutation / client wait | `LoadingSpinner` (centered) |

---

## Documented exceptions (keep these narrow)

| Screen | Why a client refetch is OK |
|--------|----------------------------|
| `/tableau-de-bord/livraisons` | Live board — auto-refresh every 30s |
| `/tableau-de-bord/utilisateurs` | Debounced search + role tab hits the API |
| Locker detail compartment edits | Interactive detail with frequent PATCH + local cache |
| Admin dashboard parcel chips | Filter may refetch `/api/parcels` when not using seed |

Business **Colis** list, **Colis** detail, and **Incidents** are **not** exceptions — they load on the server; chips/search filter in memory.

Everything else follows the server-first pattern above.

---

## API routes

- **Writes** and **exception refetches** only for page-driving data.
- Same use-case as the page. `ok` / `fail`, Zod, `requireAdminSession` / `requireBusinessSession`.
- Do **not** add mega-endpoints that sequentially load unrelated domains for first paint. Parallel `Promise.all` belongs in the **server use-case**, and only for data the screen actually shows.

---

## Database / pool

- `DATABASE_URL` — runtime transaction pooler (port `6543`)
- `DIRECT_URL` — migrations only
- Shared pool: `packages/data-access/src/db/pool.ts` (`getPool()`, concurrency gate)
- **Production** idle: 20s, `allowExitOnIdle: false` — do not change this when tuning local UX
- **Development** idle: 10 minutes, `allowExitOnIdle: false` (`resolvePoolIdleOptions`) — do not reintroduce `allowExitOnIdle: true` on the Next.js pool; it drops warm TLS clients between navigations
- Dashboards: prefer `listRecent({ take: N })` over unbounded `listAll()` when the UI is a preview, not a full register
- Query timings in dev include **checkout + TLS**. A 2s `SELECT … LIMIT 1` is almost always a new connection, not a missing index

---

## Forbidden (regressions)

```ts
// ❌ full KYC graph on a dashboard page
const { summary } = await loadOnboardingPageData(businessId);

// ❌ locker occupancy when the UI only needs a name picker
await lockers.listActiveWithAvailability();

// ❌ first paint from the client (Strict Mode will fire this twice in dev)
useEffect(() => { void fetch('/api/entreprise/issues'); }, []);

// ❌ second profile query after resolveCurrentUser()
const current = await resolveCurrentUser();
const profile = await onboarding.findProfileByAuthId(current.authUser.id);
```

```ts
// ✅
const billing = await loadBusinessBillingPageData(businessId);
const issues = await listBusinessIssues(ctx);
const profile = current.profile;
```

---

## Checklist (every PR)

| Check | Required |
|-------|----------|
| New list/detail page is an async Server Component | ✅ |
| Loader returns only fields the UI binds | ✅ |
| No `getOnboardingSummary` / `loadSummary` outside onboarding wizard + admin dossier | ✅ |
| No locker availability query unless the UI shows capacity/occupancy | ✅ |
| Use-case in `src/server/`, shared with API if route exists | ✅ |
| `loading.tsx` with `@eveider/ui` skeleton | ✅ |
| No `useEffect` + `fetch` for first paint | ✅ |
| Status/search of a loaded list filtered in memory | ✅ |
| No second `findByAuthId` in the same request | ✅ |
| No `allowExitOnIdle: true` on the Next.js pool; production idle timeout unchanged | ✅ |
| No manual refresh button | ✅ |
| No inline “Chargement…” — use `LoadingSpinner` / skeleton | ✅ |
| Client refetch only if it matches an exception above | ✅ |
| After mutation: `router.refresh()` | ✅ |
| Update `project-updates.md` when pattern/surface changes | ✅ |

---

## Reference implementations

| Pattern | Files |
|---------|--------|
| List (server) | `entreprise/tableau-de-bord/colis/page.tsx`, `entreprise/tableau-de-bord/colis/[id]/page.tsx`, `entreprise/tableau-de-bord/incidents/page.tsx`, `tableau-de-bord/incidents/page.tsx`, `casiers/page.tsx` |
| Page-specific snapshot | `server/business.ts` (`loadBusinessDashboard`, `loadBusinessSettingsPageData`, `loadBusinessBillingPageData`); `server/parcels.ts` (`listBusinessParcels`, `loadBusinessParcelDetail`); `getSettingsSnapshot` / `getBillingSnapshot` |
| Name/address picker | `LockerRepository.listActivePickerOptions` |
| In-memory list filters | `components/parcel-list.tsx`, `components/admin-issue-list.tsx` |
| Dashboard (parallel) | `tableau-de-bord/page.tsx`, `server/dashboard.ts` |
| Skeletons | `packages/ui/src/skeletons.tsx`, `packages/ui/src/loading-spinner.tsx` |
| Live exception | `admin-live-delivery-board.tsx`, `use-deliveries-query.ts` |
| Search exception | `utilisateurs/page.tsx`, `use-users-query.ts` |
| Auth (one profile lookup) | `lib/auth/get-current-user.ts`, `app/api/auth/me/route.ts` |
| Pool idle policy | `packages/data-access/src/db/pool.ts` (`resolvePoolIdleOptions`) |
