# Project Updates

Use this file as the first project memory source before searching the codebase.

## Entry Rules

- Append only meaningful changes.
- Group related changes into one entry.
- Use concise, factual descriptions.
- Include DB, API, structure, and important logic decisions.
- Record deferred testing gaps when relevant.

## Template

## YYYY-MM-DD
- Change type: DB | API | Frontend | Mobile | Infra | Other
- Description: <what changed>
- Impact: <contracts, tables, routes, folders, logic>
- Tests: <added, updated, or deferred>

## Entries

## 2026-06-08
- Change type: Infra
- Description: Scaffolded pnpm + Turborepo monorepo (Step 1): apps, packages, ESLint boundaries, design tokens, CI scripts.
- Impact: `apps/mobile`, `apps/web-admin`, `apps/web-business`; `packages/domain`, `api-contracts`, `data-access`, `ui`, `config-*`; root tooling and README.
- Tests: Domain parcel transition tests (2 passing); `pnpm build`, `lint`, `typecheck`, `test` pass.

## 2026-06-08
- Change type: Other
- Description: Added Eveider product blueprint docs (overview, brand, roles, glossary, feature specs).
- Impact: New `docs/blueprint/product/` tree and `docs/blueprint/README.md` index; AGENT_RULES references product context.
- Tests: N/A (documentation only).

## 2026-06-08
- Change type: Other
- Description: Rewrote ADR-001 for Eveider (monorepo apps, product docs, parcel lifecycle, role scope).
- Impact: `docs/blueprint/decisions/ADR-001.md` replaces Hhousing carry-over; references `apps/mobile` + `apps/web-admin`.
- Tests: N/A (documentation only).

## 2026-06-08
- Change type: Other
- Description: Added Design DNA (colors, typography, cards, buttons, per-surface feel) and RDC locale (French UI, USD + FC).
- Impact: New `design-dna.md`; `brand.md` rewritten with French glossary; overview, feature docs, AGENT_RULES, README updated.
- Tests: N/A (documentation only).

## 2026-06-08
- Change type: Other
- Description: Added B2B dimension — businesses register and submit parcels for locker delivery.
- Impact: New `business-portal.md`; Business entity and role across overview, glossary, roles, brand, admin, AGENT_RULES, ADR-001 (`apps/web-business`).
- Tests: N/A (documentation only).

## Example

## 2026-06-08
- Change type: DB
- Description: Added `parcels` and `locker_compartments` tables with status enums.
- Impact: Parcel lifecycle states drive customer tracking and courier drop-off flows.
- Tests: Added repository tests for valid status transitions and invalid transition rejection.