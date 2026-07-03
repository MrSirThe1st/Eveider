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

## 2026-06-24
- Change type: DB | API | Frontend | Mobile
- Description: Mapbox locker map system — configurable per-locker grid (rows×columns), soft-archive lockers, customer locker selection at order time, admin locker creation on map, nearest-locker APIs, mobile customer picker + courier directions.
- Impact: `lockers.rows/columns/archived_at`, `LockerStatus.archived`; `LockerRepository.create/update/archive/listNearest`; `ParcelRepository.assignLockerByCustomer`; `POST/PATCH /api/lockers`, `GET /api/lockers/nearest`, `PATCH /api/customer/parcels/[id]/locker`; Mapbox components in web-admin + `LockerMapView` in mobile; env `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- Tests: `geo.test.ts`, locker domain/contract tests updated.

## 2026-06-24
- Change type: API | Frontend
- Description: Admin live delivery board — active deliveries monitor with status summary, filters (courier, locker, business), auto-refresh every 30s, and links to parcel/courier/locker detail.
- Impact: `DeliveryRepository.listForAdmin`, `getActiveSummary`; `GET /api/deliveries`; `/tableau-de-bord/livraisons`; `AdminLiveDeliveryBoard`, `DeliveryStatusBadge`.
- Tests: `delivery.repository.test.ts` (+2).

## 2026-06-23
- Change type: DB | API | Frontend
- Description: Admin User & Courier Management: added `isBlocked` boolean to the `User` model, enforced block status globally in auth checks, implemented search/list/toggle status APIs, and built detailed courier profiles showing performance metrics (total, delivered, failed, in progress) and delivery history.
- Impact: `schema.prisma`, `OnboardingService`, `UserRepository`; new `GET /api/users`, `PATCH /api/users/[id]/status`, `GET /api/couriers/[id]` endpoints; `/tableau-de-bord/utilisateurs` views in admin dashboard.
- Tests: typecheck & eslint verification, compile check (pnpm build).

## 2026-06-23
- Change type: API | Frontend
- Description: Visual locker selection with interactive SVG map for Kinshasa bounds (Gombe, Limete, Ngaliema), search filter, dynamic viewport side-by-side splitting, and locker cards with compartment slot badges.
- Impact: `/api/lockers` API; `CreateParcelForm`, `LockerPicker`, `LockerCard`, `LockerVisualMap` components in B2B portal.
- Tests: typecheck & eslint verification, compile check (pnpm build).

## 2026-06-15
- Change type: Mobile | Frontend
- Description: Web session persistence (singleton Supabase browser client, localStorage on Expo web) and customer home journey hero with locker visuals and step progress (reçu → coursier → transit → prêt).
- Impact: `supabase.ts`, `App.tsx`, `ParcelJourneyHero`, `parcel-journey.ts`; customer parcel DTO includes `deliveryStatus`.
- Tests: deferred (UI/manual).

## 2026-06-15
- Change type: API | Frontend
- Description: Step 14 — admin analytics MVP: pickup success rate, locker usage, daily completed deliveries chart (7 days), top lockers and businesses.
- Impact: `StatsRepository.getAnalytics`; `GET /api/analytics`; `AdminAnalyticsPanel` on dashboard.
- Tests: `stats.repository.test.ts` (+1 analytics).

## 2026-06-15
- Change type: API | Frontend
- Description: Step 13 — admin KPI dashboard: today's parcels, active/completed deliveries, ready for pickup, open issues, locker occupancy on overview page.
- Impact: `StatsRepository`; `GET /api/stats`; `AdminKpiRow` on `/tableau-de-bord`.
- Tests: `stats.repository.test.ts` (+2).

## 2026-06-15
- Change type: API | Mobile
- Description: Step 12 — in-app notifications: auto-create on parcel status changes; customer list + mark read; Profile notifications screen with unread count.
- Impact: `NotificationRepository`; `GET /api/customer/notifications`, `PATCH /api/customer/notifications/[id]/read`; hooks in `ParcelRepository` + `DeliveryRepository`; `NotificationsScreen`.
- Tests: `notification.repository.test.ts` (+4).

## 2026-06-15
- Change type: API | Mobile | Frontend
- Description: Step 11 — issue reporting & admin resolution: customer/courier report incidents from parcel/delivery detail; admin incidents list with status workflow (open → in_progress → resolved).
- Impact: `IssueRepository`; `POST|GET /api/customer/issues`, `/api/courier/issues`; `GET /api/issues`, `PATCH /api/issues/[id]/status`; `ReportIssueForm`; admin `/tableau-de-bord/incidents`; `createIssueSchema`.
- Tests: `issue.repository.test.ts` (+4); `issue.test.ts` api-contracts (+3).

## 2026-06-08
- Change type: Mobile
- Description: Expo web support — `react-native-web`, `react-dom`, `@expo/metro-runtime`; `dev:web` scripts; Metro web bundler in app.json.
- Impact: `apps/mobile/package.json`, `app.json`, `docs/setup/auth.md`.
- Tests: `expo export --platform web` (manual).

## 2026-06-08
- Change type: Mobile
- Description: Bottom tab navigation — COLIS + PROFIL tabs with Feather icons; Profile screen with identity card, placeholder menu items, déconnexion; tab bar hides on detail/scan flows.
- Impact: `@react-navigation/bottom-tabs`; `MobileTabs`, `ProfileScreen`, `ProfileMenuItem`; `App.tsx` wrapped in `NavigationContainer`.
- Tests: deferred (manual).

## 2026-06-08
- Change type: Mobile
- Description: Mobile-first UX polish — shared header, pull-to-refresh, hero card (customer), action highlights, courier step indicator, success banners, fixed action bar, completed deliveries section.
- Impact: `ScreenHeader`, `HeroCard`, `DeliveryCard`, `DeliveryStepIndicator`, `SuccessBanner`; `CustomerHome`, `CourierHome`, `ParcelCard`.
- Tests: deferred (visual/manual).

## 2026-06-08
- Change type: API | Mobile | Frontend
- Description: Step 10 — courier delivery flow: admin assigns courier to parcel; courier lists/scans/confirms drop-off; parcel auto-advances to ready_for_pickup with PIN on completion.
- Impact: `DeliveryRepository`; `GET/POST /api/courier/deliveries/*`; `POST /api/parcels/[id]/assign-courier`; `GET /api/couriers`; mobile `CourierHome`; admin parcel detail courier assign UI.
- Tests: `delivery.repository.test.ts` (+4).

## 2026-06-08
- Change type: Mobile
- Description: Mobile auth switched from phone OTP to email + password (dev-friendly, no SMS provider); customer register still collects phone for parcel matching.
- Impact: `AuthScreen`; `docs/setup/auth.md`.
- Tests: deferred (auth flow manual).

## 2026-06-08
- Change type: Mobile
- Description: Step 9 — customer pickup flow: parcel list/detail by phone match, status timeline, PIN screen when ready_for_pickup; auto PIN on status advance.
- Impact: `GET /api/customer/parcels`; mobile `CustomerHome`; `ParcelRepository.listForCustomer`; `pickup_pins` on `ready_for_pickup`.
- Tests: context phone scope (+1); parcel PIN creation (+1).

## 2026-06-08
- Change type: API
- Description: Step 8 — admin locker management: list with occupancy counts, detail with compartment grid, locker + compartment status updates.
- Impact: `LockerRepository.listAll/findById/update*`; `web-admin` `/tableau-de-bord/casiers`, `/api/lockers`; `updateLockerStatusSchema`, `updateCompartmentStatusSchema`.
- Tests: api-contracts locker schemas (+3).

## 2026-06-08
- Change type: API
- Description: Step 7 — minimal admin dashboard: all-parcel list with filters, parcel detail + advance status, business list + status management.
- Impact: `web-admin` `/tableau-de-bord`, `/api/parcels`, `/api/businesses`; `listAll` + relations; `updateParcelStatusSchema`, `updateBusinessStatusSchema`.
- Tests: api-contracts business + parcel status schemas (+3).

## 2026-06-08
- Change type: DB
- Description: Step 6 — Kinshasa locker seed (`pnpm db:seed`), availability in picker, parcel status filters, locker on list/detail.
- Impact: `prisma/seed.ts`; `LockerRepository.listActiveWithAvailability`; parcel list `?status=`; UI filters.
- Tests: api-contracts parcel query schema (+1).

## 2026-06-08
- Change type: API
- Description: Step 5 — business parcel submission: create/list/detail API, dashboard UI, locker picker; new businesses auto-active for MVP.
- Impact: `POST|GET /api/parcels`, `GET /api/parcels/[id]`, `GET /api/lockers`; `createParcelSchema`; `LockerRepository`; `/tableau-de-bord/colis/*`.
- Tests: api-contracts parcel schema (+2); existing data-access parcel tests unchanged.

## 2026-06-08
- Change type: Frontend
- Description: Web auth simplified to email + password (signUp / signInWithPassword); removed phone OTP, magic links and callback routes from web apps.
- Impact: `AuthForm` rewritten; deleted `/auth/callback`, `/auth/complete`, `pending-auth`; `signInSchema` in api-contracts; `docs/setup/auth.md`.
- Tests: api-contracts auth tests updated.

## 2026-06-08
- Change type: Frontend
- Description: Email auth uses Supabase magic links (not OTP codes) — `/auth/callback` + `/auth/complete`; phone keeps SMS OTP.
- Impact: `AuthForm` email-sent step; `pending-auth` sessionStorage for register; `docs/setup/auth.md` redirect URLs.
- Tests: deferred (auth flow manual).

## 2026-06-08
- Change type: Frontend
- Description: Public landing page at `/` — routes visitors to entreprises, admin, client and courier services; business dashboard moved to `/tableau-de-bord`.
- Impact: `LandingPage`, `ServiceCard`; middleware public `/`; `NEXT_PUBLIC_ADMIN_URL`; connexion/inscription back-links.
- Tests: deferred (UI-only).

## 2026-06-08
- Change type: Frontend
- Description: Web auth — email OTP alongside phone on business portal and admin login/register flows.
- Impact: `AuthForm` (phone/email tabs) replaces `PhoneAuthForm`; `onboardUserSchema` + email OTP schemas; onboard/me routes persist and return `email`; `docs/setup/auth.md`.
- Tests: api-contracts auth tests updated (6 passing).

## 2026-06-08
- Change type: API
- Description: Step 4 — phone OTP auth, role routing, profile onboarding across admin, business, mobile.
- Impact: `OnboardingService`; web `/connexion` + `/inscription`; API `/api/auth/me|onboard`; mobile auth screens; `docs/setup/auth.md`.
- Tests: 43 passing (+5 auth schema, +3 onboarding).

## 2026-06-08
- Change type: DB
- Description: Step 3 — Prisma schema, repositories, Supabase admin client, initial migration.
- Impact: `packages/data-access/prisma/` (10 models); User/Business/Parcel repositories with role scope; migration `20260608193000_init`; `.env.example` sanitized (secrets → local `.env` only).
- Tests: 11 data-access tests (context + parcel repo mocks); run `pnpm db:deploy` locally to apply migration.

## 2026-06-08
- Change type: Other
- Description: Step 2 — expanded domain package (parcel, business, locker, delivery, issue, roles, French labels) + Zod schemas + Supabase init.
- Impact: `packages/domain/src/*` modularized; `packages/api-contracts` Zod enums; `supabase/` CLI config; `docs/setup/supabase.md`; `.env.example` updated for publishable key + project URL.
- Tests: 27 passing (24 domain, 3 api-contracts).

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