# Data Fetching Patterns

**Mandatory for every new or changed screen in `web-manager`.**  
Do not invent a parallel pattern. If a screen needs something outside this doc, document it as a named exception in the PR.

## One architecture

```
Navigation (read)
  → async Server Component page.tsx
  → getAdminSession() / requireBusinessSession()   [React cache(), once per request]
  → server use-case in apps/*/src/server/*
  → packages/data-access repositories
  → pass serializable props to *Panel / *View / *List (client)
  → loading.tsx → skeleton from @eveider/ui

Mutations (write)
  → client component
  → POST/PATCH/DELETE /api/*  (thin wrapper around the same use-case)
  → router.refresh()  (± invalidateQueries for live boards)

Live / heavy client filters (exceptions only)
  → React Query + /api/*
  → LoadingSpinner for waits — never inline “Chargement…” text
```

### Rules (non-negotiable)

1. **Every new list/detail page** loads data on the server. No `useEffect` + `fetch` for first paint. No `useQuery` for initial list load.
2. **Every route that awaits data** has a sibling `loading.tsx` using a skeleton from `@eveider/ui`.
3. **Loading UI** uses `@eveider/ui` only: `LoadingSpinner`, `TableSkeleton`, `CardListSkeleton`, `DashboardOverviewSkeleton`. Never a bare `<p>Chargement…</p>` or a per-page “Rafraîchir” button.
4. **Use-cases** live in `src/server/` and are shared by the page and the matching API route.
5. **React Query** is allowed only for: mutations/cache helpers, live auto-refresh boards, debounced server-side search. Status chips that can filter an already-loaded array must filter **in memory**, not refetch.

---

## Server use-case layer

```
apps/web-manager/src/server/
  session.ts                 # getAdminSession (cache)
  dashboard.ts               # loadAdminDashboard
  business-applications.ts
  businesses.ts
  lockers.ts
  issues.ts
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
import { PageHeader, TableSkeleton } from '@eveider/ui'; // loading.tsx uses skeleton
import { ThingList } from '@/components/thing-list';
import { listThings } from '@/server/things';
import { getAdminSession } from '@/server/session';

export default async function ThingsPage() {
  const { ctx } = await getAdminSession();
  const things = await listThings(ctx);
  return (
    <>
      <PageHeader title="…" description="…" />
      <ThingList things={things} />
    </>
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

Client panel receives props; mutations call `/api/*` then `router.refresh()`.

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

| Screen | Why React Query / client fetch is OK |
|--------|--------------------------------------|
| `/tableau-de-bord/livraisons` | Live board — auto-refresh every 30s |
| `/tableau-de-bord/utilisateurs` | Debounced search + role tab hits the API |
| Locker detail compartment edits | Interactive detail with frequent PATCH + local cache |
| Dashboard parcel status chips | Filter may refetch `/api/parcels` when not using seed |

Everything else follows the server-first pattern above.

---

## API routes

- **Writes** and **exception refetches** only for page-driving data.
- Same use-case as the page. `ok` / `fail`, Zod, `requireAdminSession(perf)`.
- Do **not** add mega-endpoints that sequentially load unrelated domains for first paint. Parallel `Promise.all` belongs in the **server use-case**.

---

## Database

- `DATABASE_URL` — runtime pooler  
- `DIRECT_URL` — migrations / `db:push` only  
- Dev: `connection_limit=5` so `Promise.all` can run in parallel (`packages/data-access/src/client.ts`)  
- Dashboards: prefer `listRecent({ take: N })` over unbounded `listAll()`

---

## Checklist (every PR)

| Check | Required |
|-------|----------|
| New list/detail page is an async Server Component | ✅ |
| Use-case in `src/server/`, shared with API if route exists | ✅ |
| `loading.tsx` with `@eveider/ui` skeleton | ✅ |
| No manual refresh button | ✅ |
| No inline “Chargement…” — use `LoadingSpinner` / skeleton | ✅ |
| React Query only if it matches an exception above | ✅ |
| After mutation: `router.refresh()` | ✅ |
| Update `project-updates.md` when pattern/surface changes | ✅ |

---

## Reference implementations

| Pattern | Files |
|---------|--------|
| List (server) | `entreprises/applications/page.tsx`, `casiers/page.tsx`, `entreprises/page.tsx`, `incidents/page.tsx` |
| Dashboard (parallel) | `tableau-de-bord/page.tsx`, `server/dashboard.ts` |
| Skeletons | `packages/ui/src/skeletons.tsx`, `packages/ui/src/loading-spinner.tsx` |
| Live exception | `admin-live-delivery-board.tsx`, `use-deliveries-query.ts` |
| Search exception | `utilisateurs/page.tsx`, `use-users-query.ts` |
| Auth | `server/session.ts`, `lib/auth/get-current-user.ts` |
