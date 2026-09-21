# UI verification

Keep Playwright specs and Cursor Browser available. Do **not** use them as the default after a UI change.

Follow `.cursor/rules/eveider-test-scope.mdc`.

## Default (normal UI work)

One targeted typecheck + relevant Vitest only.

Do **not** browser-verify simple copy, styling tweaks, minor layout changes, or internal refactors.

Do **not**:

- Run Playwright automatically
- Run the full E2E suite unless the user asks or the task is major E2E verification
- Use Cursor Browser when automated tests already cover the change
- Start another Next dev server if one is already running
- Seed or reset the database unless the task requires it

## When browser or E2E is necessary

Use Cursor Browser only when **visual or interactive behavior genuinely needs manual verification**.

Use Cursor Browser or Playwright only for **significant interactive** changes, **critical user flows**, or when the user **explicitly** asks.

From `apps/web-manager` (never an extra `--`, never `pnpm --filter … test:e2e -- …`):

```bash
pnpm test:e2e e2e/<file>.spec.ts
```

Specs live in `apps/web-manager/e2e/`. Config: `apps/web-manager/playwright.config.ts`. E2E expects the **existing** `pnpm dev` on port 3000.

Full suite (only when asked or major regression): from `apps/web-manager`, `pnpm test:e2e`.

Cursor Browser is only for visual/interactive behavior that needs a manual pass, and only when tests do not already cover it. Screenshots alone are not verification.

### Seed accounts (when a spec runs)

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

Keep unit tests (Vitest) for pure nav config helpers. Writing a spec is not the same as running the full suite.

## Settings IA (reference)

Organization and admin Paramètres use a secondary sidebar (`SettingsLayoutShell` + `settings-nav.ts` via `SettingsChrome` in the dashboard shell). Paiement / Équipe live under Paramètres (not primary nav). Admin groups: Mon compte, Fonctionnement (règles, tarifs, casiers), Équipe Eveider, Outils. See `apps/web-manager/src/lib/settings-nav.ts`.

### Loading skeletons

Paramètres `loading.tsx` files must use **content-only** skeletons (`SettingsBodySkeleton`) — never a full `PageFrame` that replaces the secondary sidebar or section tabs.

- Secondary sidebar: client chrome in the shell (instant on navigate)
- Casiers Configuration / Modèles / Zones: persistent `AdminCasiersSettingsChrome` layout; only the panel body skeletons
- Livraisons / Incidents: persistent `AdminLivraisonsChrome` in `(operations)` layout; content-only `loading.tsx`
- Organisations list / Vérification: persistent `AdminOrganisationsChrome` in `(directory)` layout; content-only `loading.tsx`
- Organization / driver detail tabs: tabs live in `[id]/layout.tsx`; `[id]/loading.tsx` is content-only
- Other settings sections: body skeleton beside the secondary nav

When switching tabs: keep header/sidebar/tabs mounted, update active-tab styling immediately, skeleton only the tab content area.
