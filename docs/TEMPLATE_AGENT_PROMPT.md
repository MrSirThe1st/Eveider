# Agent Prompt: Create Product Blueprint Docs Template

Copy everything below the line into a new project chat. Replace the bracketed values at the top of the prompt before running, or leave them for the agent to ask about.

---

## Task

Create a complete `docs/` folder for this project as a **reusable product blueprint** that AI coding agents must follow. Reproduce the structure, file set, and *operating conventions* of a mature monorepo blueprint (product memory + AI rules + setup guides + ADRs). Do **not** copy content from any prior product. Do **not** mention or infer any previous project name, domain, brand, market, or feature set.

Fill every file with **placeholders and scaffolding** tailored to **this** product using the parameters below. Where product-specific facts are unknown, use clear `{{PLACEHOLDER}}` tokens and short TODO comments — never invent a fake domain.

### Product parameters (fill these in or ask once, then proceed)

| Parameter | Value |
|-----------|-------|
| `{{PRODUCT_NAME}}` | [PRODUCT NAME] |
| `{{ONE_LINE_PURPOSE}}` | [one sentence: what the product does] |
| `{{PRIMARY_LOCALE}}` | [e.g. French / English] |
| `{{MARKET_OR_REGION}}` | [e.g. RDC / US / EU] |
| `{{CURRENCY}}` | [e.g. USD + local] |
| `{{SURFACES}}` | [e.g. mobile app, business portal, admin dashboard] |
| `{{ROLES}}` | [e.g. customer, courier, business, admin] |
| `{{CORE_ENTITIES}}` | [comma-separated domain nouns] |
| `{{PACKAGE_MANAGER}}` | pnpm |
| `{{MONOREPO_APPS}}` | [e.g. apps/mobile, apps/web] |
| `{{SHARED_PACKAGES}}` | [e.g. domain, api-contracts, data-access, ui] |
| `{{WEB_APP_PATH}}` | [e.g. apps/web] |
| `{{UI_PACKAGE}}` | [e.g. @org/ui] |
| `{{AUTH_PROVIDER}}` | [e.g. Supabase Auth] |
| `{{DB_ACCESS}}` | [e.g. PostgreSQL via pg + SQL migrations] |

If any parameter is still `[…]`, ask the user once for missing values, then create all files in one pass.

---

## Hard constraints

1. **Zero carry-over** — No prior product names, locker/parcel/courier jargon, RDC/Eveider/InPost references, seed emails, project refs, or historical changelog entries from another codebase.
2. **Template, not fiction** — Prefer placeholders and “fill when known” sections over inventing a full fake product.
3. **AI-operable** — Agent rules must be actionable: before-every-task checklist, PR blockers, test minimums, append-only changelog format.
4. **Relative links** — All cross-links between docs must work from their real paths under `docs/`.
5. **Create every file listed below** — Do not skip files; stub with TODOs if needed.
6. **Do not** create Cursor rules, code, or apps unless asked — only the `docs/` tree.

---

## Exact folder tree to create

```text
docs/
├── blueprint/
│   ├── README.md
│   ├── ai/
│   │   ├── AGENT_RULES.md
│   │   ├── data-fetching.md
│   │   └── ui-verification.md
│   ├── decisions/
│   │   ├── ADR-001.md
│   │   └── ADR-002.md          # stub second ADR or product-specific decision TBD
│   ├── product/
│   │   ├── overview.md
│   │   ├── brand.md
│   │   ├── design-dna.md
│   │   ├── roles-and-flows.md
│   │   ├── glossary.md
│   │   └── features/
│   │       ├── surface-a.md    # one feature doc per major surface/role
│   │       ├── surface-b.md
│   │       └── …               # name files from {{SURFACES}} / {{ROLES}}
│   └── templates/
│       └── project-updates.md
└── setup/
    ├── supabase.md             # or rename if auth/db provider differs
    └── auth.md
```

Adapt setup filenames if `{{AUTH_PROVIDER}}` is not Supabase (e.g. `setup/auth-provider.md`), but keep a `docs/setup/` guide for env + auth.

For feature files: create **one markdown file per major user-facing surface** listed in `{{SURFACES}}`, using kebab-case names (e.g. `admin-dashboard.md`, `customer-mobile.md`). Do not invent surfaces that are not in the parameters.

---

## What each file must contain

### `docs/blueprint/README.md`

- Title: `{{PRODUCT_NAME}} Blueprint`
- Short intro: project memory + product context; agents read these before implementing
- **Read order** (numbered list linking to):
  1. `product/overview.md`
  2. `product/brand.md`
  3. `product/design-dna.md`
  4. `product/roles-and-flows.md`
  5. `product/glossary.md`
  6. Feature docs under `product/features/`
  7. `templates/project-updates.md`
  8. `ai/AGENT_RULES.md`
  9. `ai/data-fetching.md` (mandatory before new pages / API routes / repository loaders)
  10. `ai/ui-verification.md`
- Tables indexing Product Docs and Other (templates, AI, ADRs, setup links)

### `docs/blueprint/ai/AGENT_RULES.md`

Structure exactly like an operating manual:

1. **Product Scope** — table of surfaces × users × purpose from parameters; list core entities; optional lifecycle sketch with TODOs; role scopes (what each role may / may not access); rule to defer work outside product goals
2. **Before Every Task**
   - Read `project-updates.md` first
   - Read relevant `product/` docs (start overview; see README index)
   - UI work → `design-dna.md` + `brand.md` + verify per `ui-verification.md`
   - Data loading / new pages / API / loaders → follow `data-fetching.md` strictly
   - Ambiguous / schema / auth / packages / large refactors → ask first
3. **Standards (always enforced)**
   - TypeScript strict; ban `any` in non-trivial code
   - Zod (or equivalent) validate all external input at API boundaries
   - Auth check on every protected server operation; enforce role scope
   - Shared result type, e.g. `ApiResult<T> = { success: true; data: T } | { success: false; error: string }`
   - No DB or privileged service calls from client/UI
   - Reuse existing types/components/logic before creating new
   - **Reads:** async Server Component → `src/server/` use-case → repository returning only fields the screen binds
   - Do not load full “summary graphs” or duplicate profile lookups when unused
   - Prefer `getUser()`-style session validation over trusting client session alone (adapt to `{{AUTH_PROVIDER}}`)
   - Document any pool / connection idle policy that must not be broken
4. **Workflow** — read docs → smallest slice → run `{{PACKAGE_MANAGER}} lint && typecheck && test && build` → append to `project-updates.md` if meaningful
5. **PR is blocked if** — failed checks; unvalidated input; missing auth/role check; `any`; client `useEffect`+`fetch` for first paint on list/detail; unused-domain fan-out loaders; duplicate profile lookup in one request; forbidden pool tweaks
6. **Minimum Test Coverage** — new API: success / validation / auth / role-scope failure; new logic: happy + one failure; domain transitions if applicable
7. **Delivery Priority** — numbered MVP sequence derived from `{{ONE_LINE_PURPOSE}}` and roles (placeholders OK)
8. **project-updates.md Format** — append-only template:

```text
## YYYY-MM-DD
- Type: DB | API | Frontend | Mobile | Infra | Other
- Description: what changed
- Impact: tables, routes, contracts, folders affected
- Tests: added | updated | deferred (reason)
```

### `docs/blueprint/ai/data-fetching.md`

Codify a **server-first** web data architecture (generic; no product domain):

- Title + “mandatory for every new or changed screen in `{{WEB_APP_PATH}}`”
- One architecture diagram (text):

```text
Navigation (read)
  → async Server Component page.tsx
  → cached session helper (once per request)
  → page-specific use-case in {{WEB_APP_PATH}}/src/server/*
  → repository method returning only this screen’s data
  → serializable props to client Panel/View/List
  → loading.tsx → skeleton from {{UI_PACKAGE}}

Mutations (write)
  → client → POST/PATCH/DELETE /api/* → router.refresh()

Live / heavy client filters (exceptions only)
  → documented hook + /api/* + shared LoadingSpinner — never inline “Loading…” text
```

- **Non-negotiable rules:** RSC first paint; sibling `loading.tsx` with shared skeletons; use-cases in `src/server/` shared with API; client refetch only for mutations / live boards / debounced server search; load only what the screen renders; one profile lookup per request; `React.cache()` is per HTTP request
- **Load only what the page needs** — table of Screen needs | Loader | Do not call (use generic examples: dashboard snapshot vs full onboarding graph; name picker vs availability aggregate)
- **Repository shape** — good page-specific snapshot vs bad convenience fan-out; prefer one SQL/`JOIN`/`json_agg` over unrelated `Promise.all`
- **Auth lookups** — middleware / RSC / cookie API / bearer API table (adapt to `{{AUTH_PROVIDER}}`)
- **Server use-case layer** — folder sketch under `src/server/`
- **Page pattern** — copy-paste RSC + `loading.tsx` examples using `{{UI_PACKAGE}}`
- **Loading UI map** — route nav → skeleton; mutation wait → spinner
- **Documented exceptions** — empty table with guidance to keep narrow
- **API routes** — writes + exception refetches; same use-case; Zod; session helpers
- **Database / pool** — placeholders for `DATABASE_URL` / `DIRECT_URL` / idle policy if using Postgres pooler
- **Forbidden regressions** — code blocks of anti-patterns
- **Checklist (every PR)** — markdown table of required checks
- **Reference implementations** — table with `TODO: path` until code exists

### `docs/blueprint/ai/ui-verification.md`

- Prefer Cursor Browser / browser MCP when available (click, type, navigate — screenshots alone insufficient)
- Fallback: Playwright against local web app
- Commands table using `{{PACKAGE_MANAGER}}` and `{{WEB_APP_PATH}}` filter
- Seed accounts section as placeholders (no real passwords from other projects)
- When to add e2e vs unit tests
- Optional: settings IA / skeleton notes as TODOs for this product’s chrome

### `docs/blueprint/templates/project-updates.md`

- Intro: first project memory source before searching the codebase
- Entry rules (append only, group related, factual, record deferred tests)
- Template block (same format as AGENT_RULES)
- `## Entries` section with **one starter example entry only** for “blueprint docs added” dated today — no historical dump from another product

### `docs/blueprint/decisions/ADR-001.md`

ADR for adopting the blueprint + monorepo architecture:

- Status / Date / Owners
- Context: risks without constraints (duplication, auth gaps, type unsafety, etc.) — keep product-agnostic except `{{PRODUCT_NAME}}`
- Decision list: monorepo apps/packages from parameters; layered deps; TS strict; auth provider; DB access; Zod; `ApiResult`; domain rules in shared package; ESLint boundaries; `project-updates.md` as memory; `product/` as domain truth
- App responsibilities table from `{{MONOREPO_APPS}}`
- Consequences / Alternatives / Rollout / Validation / Related docs links

### `docs/blueprint/decisions/ADR-002.md`

Either:

- A **stub** ADR titled “TBD — first domain decision” with Status: Proposed and empty Context/Decision sections to fill later, **or**
- If the user already stated a core domain split (e.g. entity A vs entity B), write that ADR generically without unrelated product history

Do not invent a complex domain decision from another industry.

### Product docs (`docs/blueprint/product/*`)

All use `{{PRODUCT_NAME}}` and parameters. Keep sections, but content must match **this** product only.

| File | Required sections |
|------|-------------------|
| `overview.md` | What it is; Problem; Solution; Market/locale; Surfaces table; MVP in/out of scope; Success metrics; Related docs |
| `brand.md` | Name; Market; Positioning; Voice & tone table; Plain-language rules for `{{PRIMARY_LOCALE}}`; Naming glossary placeholders; UX principles |
| `design-dna.md` | Visual personality; Color system table (placeholders or TODO hex); Distribution; Typography; Spacing/radius; Component feel; Per-surface feel; Anti-patterns (“never”) |
| `roles-and-flows.md` | Roles table; Core journeys per role (ASCII flow + numbered steps); Cross-cutting rules (auth, tenancy, notifications) |
| `glossary.md` | Entities table from `{{CORE_ENTITIES}}`; Status enums / lifecycles with TODOs; Terms that must stay consistent in code + UI |
| `features/*.md` | Purpose; Design note linking design-dna; Who uses it; Screens (H2/H3); Behaviors; Out of scope; Link to data-fetching where web lists apply |

### Setup docs

**`docs/setup/supabase.md`** (or provider equivalent):

- Placeholder project ref / URL — never paste secrets or another project’s ref
- Local env steps (`.env.example` → `.env`)
- Pooler vs direct URL guidance if Postgres
- CLI link steps as placeholders
- Migration location pointer (`db/migrations/` or TODO)
- Seed / verify commands as placeholders

**`docs/setup/auth.md`:**

- How web vs mobile auth work for this stack
- Route map placeholders for `{{WEB_APP_PATH}}`
- Session resolution layers (middleware / RSC / API) aligned with `data-fetching.md`
- Role redirect rules
- First admin / bootstrap as TODO
- Redirect URLs checklist for the auth provider dashboard

---

## Writing style

- Concise, imperative, agent-oriented (“Do X. Do not Y.”)
- Tables over long prose where possible
- English for internal/architecture docs unless the user asks otherwise; call out that **user-facing** copy follows `{{PRIMARY_LOCALE}}`
- Cross-link with relative markdown paths
- No emojis unless the brand doc requires them

---

## Done criteria

1. Entire tree exists with all listed files
2. No prior-product names, domains, or changelog history
3. Placeholders consistently use `{{LIKE_THIS}}`
4. `README.md` read-order matches files that exist
5. `AGENT_RULES.md`, `data-fetching.md`, and `project-updates.md` are complete enough that an agent can start a greenfield feature without inventing process
6. Print a short summary: files created + which placeholders the user must still fill

---

## Start now

Create the full `docs/` tree as specified. If product parameters above are still bracketed, ask for them in one message; otherwise write all files immediately.
