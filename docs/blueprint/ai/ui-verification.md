# UI verification (Playwright + Cursor Browser)

Use this when implementing or changing web-manager UI (layout, navigation, forms, role-gated screens).

## Prefer Cursor Browser when available

If the session has Cursor Browser / browser MCP tools, exercise the changed flow there first (click, type, navigate). Screenshots alone are not enough.

When Cursor Browser is **not** available, use Playwright against the local portal.

## Playwright (web-manager)

Installed in `apps/web-manager` (`@playwright/test`). Chromium is installed via `pnpm exec playwright install chromium`.

| Command | Purpose |
|---------|---------|
| `pnpm --filter @eveider/web-manager test:e2e` | Run headless e2e (expects `pnpm dev` on port 3000) |
| `pnpm --filter @eveider/web-manager test:e2e:ui` | Playwright UI mode |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm --filter @eveider/web-manager test:e2e` | Override base URL |

Config: [`apps/web-manager/playwright.config.ts`](../../../apps/web-manager/playwright.config.ts)  
Specs: [`apps/web-manager/e2e/`](../../../apps/web-manager/e2e/)

### Seed accounts for e2e

Password: `EveiderDemo2026!` (or `SEED_PASSWORD`).

| Persona | Email |
|---------|-------|
| Platform admin | `admin@eveider.cd` |
| Org owner | `boutique.lubum@eveider.cd` |
| Org dispatcher | `boutique.lubum.logistics@eveider.cd` |

Helper: `e2e/helpers/auth.ts` → `signIn(page, email)`.

### When to add an e2e spec

Add or extend a Playwright spec for:

- New multi-section navigation (settings, secondary sidebars, role-gated menus)
- Cross-role visibility differences
- Critical auth-gated redirects after IA moves

Keep unit tests (Vitest) for pure nav config helpers; keep Playwright for real routes + auth cookies.

## Settings IA (reference)

Organization and admin Paramètres use a secondary sidebar (`SettingsLayoutShell` + `settings-nav.ts` via `SettingsChrome` in the dashboard shell). Facturation / Équipe are nested under Paramètres (not primary nav). See `apps/web-manager/src/lib/settings-nav.ts`.

### Loading skeletons

Paramètres `loading.tsx` files must use **content-only** skeletons (`SettingsBodySkeleton`) — never a full `PageFrame` that replaces the secondary sidebar or section tabs.

- Secondary sidebar: client chrome in the shell (instant on navigate)
- Casiers Configuration / Modèles: persistent `AdminCasiersSettingsChrome` layout; only the panel body skeletons
- Other settings sections: body skeleton beside the secondary nav
