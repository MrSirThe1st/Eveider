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

## 2026-09-02
- Change type: Frontend
- Description: Paramètres → Mon compte → Préférences is live on org and admin (langue + apparence). Portal stays French-only. Appearance reuses `eveider_theme` (clair / sombre / automatique) and the cookie-consent gate. Header theme toggle still sets an explicit clair/sombre.
- Impact: `AccountPreferencesPanel`; org/admin `preferences/page.tsx` + `loading.tsx`; `applyThemePreference`; cookies policy copy.
- Tests: Playwright settings-sidebar visits Préférences; browser on Boutique Kenya Clair/Sombre.

## 2026-09-02
- Change type: DB | API | Frontend
- Description: Organisation API + outbound software notifications. Bearer `eveider_live_…` keys (hashed at rest, plaintext once), gated by `API_ACCESS`. Public `POST/GET /api/v1/parcels` (UUID or tracking) and `GET /api/v1/points`. After selected parcel events, best-effort HTTPS POST signed HMAC-SHA256 (`X-Eveider-Signature`); logged, no retry worker. Org Paramètres → API replaces coming-soon (Clé d’accès, Adresse de notification, Envoyer un essai). Historique actor `api_key` = CLÉ API. Admin API page stays stub.
- Impact: migration `026_*_organization_api.sql`; `OrganizationApiRepository`; `requireOrgApiKey`; notify after `appendParcelEvent` (skipped under Vitest); org settings APIs under `/api/organisation/api/*`.
- Tests: secrets/notify/repo unit tests; Playwright Boutique Kenya Paramètres → API create key.

## 2026-09-02
- Change type: DB | API | Frontend | Mobile
- Description: Return leg — second delivery on the same parcel (`deliveries.kind` outbound|return). Explicit **Créer un retour** on admin and org Colis detail assigns a locker→merchant delivery. Completing a return releases the compartment, invalidates the PIN, and does not change parcel status; Colis location becomes RETOUR EN COURS / RETOURNÉ. Admin assign path fixed to `/api/parcels/[id]/assign-courier`.
- Impact: migration `025_*_delivery_kind.sql`; `canCreateReturnLeg`; `DeliveryRepository.assign(..., kind)` / `completeDropOff` return branch; assign APIs accept `kind`; business location derivation uses latest delivery kind.
- Tests: domain + delivery repo unit tests; Playwright on seed `LSH-1001` Créer un retour.

## 2026-09-02
- Change type: API | Frontend
- Description: Organisation Colis detail shows the same parcel-event Historique as admin (read-only timeline). Events load in `loadBusinessParcelDetail` (Server Component first paint); shared `ParcelEventTimeline` component. `listForParcel` allows owning business with `view_parcels`.
- Impact: `BusinessParcelDetailView.events`; org `GET /api/organisation/parcels/[id]` includes events; `ParcelEventRepository.listForParcel` business scope.
- Tests: parcel-event repo unit tests for business access; browser on org Colis detail Historique.

## 2026-09-02
- Change type: DB | API | Frontend
- Description: Driver dossiers link to service areas. Optional `driver_dossiers.service_area_id` (backfilled from business address city / email heuristics). Create/detail can assign a zone; admin & org chauffeur lists filter by zone; Eveider Équipes shows zone + filter for drivers. No teams table — zone ≠ team.
- Impact: migration `024_*_driver_service_areas.sql`; roster join; `updateServiceArea`; `PATCH /api/admin/driver-dossiers/[id]`; create schemas; driver/team UI.
- Tests: courier-dossier repo unit tests; migrate + browser/e2e on chauffeur zone filter.

## 2026-09-02
- Change type: DB | API | Frontend
- Description: Service areas (zones de service). New `service_areas` table (code, name, city, status) with optional `lockers.service_area_id`. Seeded KIN/LSH/KWZ and backfilled lockers by city. Admin Paramètres → Casiers → Zones CRUD; Points list filters by zone; create/detail can assign a zone (auto by city when omitted).
- Impact: migration `023_*_service_areas.sql`; `ServiceAreaRepository`; `/api/service-areas`; locker create/update/list filters; `AdminServiceAreasPanel`; Points + locker detail UI.
- Tests: service-area repo unit tests; migrate + browser on Zones + Points filter.

## 2026-09-01
- Change type: DB | API | Frontend
- Description: Parcel operational event / audit spine. New `parcel_events` table records lifecycle transitions with actor (`user` / `system` / `api_key`). Emitted from parcel, delivery, issue, and WhatsApp mutation sites. Admin Colis detail shows a chronological Historique timeline.
- Impact: migration `022_*_parcel_events.sql`; domain `ParcelEventType` / labels; `ParcelEventRepository`; `GET /api/parcels/[id]` returns `events`; `AdminParcelDetail` Historique section. Notifications remain the delivery channel; events are the audit log. No PIN plaintext or photo bytes in payload.
- Tests: unit tests for append/list/actor + delivery mocks tolerate event inserts; browser verification of Historique deferred to manual/seed flow.

## 2026-08-30
- Change type: API | Frontend
- Description: Livraisons board silent refresh is cheaper — still 30s auto-refresh on the active view, but pauses when the tab is hidden, resumes (and refreshes once) on return, and silent ticks request `includeMeta=0` so businesses/lockers/drivers catalogs are not reloaded. Profile + memberships cached ~30s after `getUser()` so polls do not re-hit those tables every tick. No other pages use interval polling.
- Impact: `GET /api/deliveries/board?includeMeta=0`; `useDeliveriesBoardQuery`; `resolveCurrentUser` identity cache; `listDeliveriesQuerySchema.includeMeta`.
- Tests: Browser — board still updates; terminal shows lighter silent polls when tab visible.

## 2026-08-30
- Change type: Frontend
- Description: Reserved bottom space for the Tawk support bubble so it no longer covers last table rows, row actions, or toasts. One CSS token `--support-widget-clearance` on the portal scroll area, public pages, auth viewport, dropdowns, and toasts.
- Impact: `globals.css`, `AppShell` `.portal-content`, landing/auth/cookie chrome, `DropdownMenu` collision, toast viewport.
- Tests: Cursor Browser on a full-height table page.


## 2026-08-30
- Change type: Frontend | Other
- Description: Platform-wide French copy pass — everyday RDC language. Removed KYC/COD/organisation/expédition jargon from settings, onboarding, drivers, auth, landing, and admin review. Settings labels: Entreprise, Facturation, API, Droits d’accès. Brand.md now requires plain language (say what happens, no English in FR UI).
- Impact: User-facing strings in web-manager + domain labels; URLs unchanged. Playwright settings/drivers assertions updated.
- Tests: e2e settings-sidebar + drivers copy; Cursor Browser on settings.


## 2026-08-29
- Change type: Frontend | API
- Description: Admin Drivers remodel — same Driver entity as Organization, platform-wide list (organization / Eveider fleet, operational status, current delivery, today), details tabs Overview / Deliveries / Documents with KYC approve/reject/invite/reactivate and account block, and a separate Add page that creates Eveider-fleet drivers then invites. Organization details dropped Routes/Activity placeholders so both portals share three tabs. List stays compact; KYC actions live on Documents.
- Impact: `listRosterForAdmin` / `findRosterById`; `listForAdminDriver`; admin routes `/tableau-de-bord/chauffeurs` (+ `/nouveau`, `/[id]` tabs); `POST /api/admin/driver-dossiers` creates Eveider fleet + invite; Documents uses review/invite/reactivate + `PATCH /api/users/:id/status`. Deleted `admin-courier-panel` and org itineraires/activité pages.
- Tests: admin roster snapshot SQL; Playwright org (3 tabs) + admin list/detail/add.

## 2026-08-29
- Change type: Frontend | API
- Description: Organization Drivers V1 — operational list (status, current delivery, today), driver profile tabs (overview / deliveries / documents; routes and activity coming soon), and a separate add-and-invite flow. Drivers stay out of Members. Invite can happen during KYC review; assignment still requires an approved dossier. Team / vehicle / live location show as —. Platform admin KYC page unchanged.
- Impact: `CourierDossierRepository.listRosterForBusiness` / `findRosterByBusiness` / `attachInvite`; `AccountService.inviteDossier`; `DeliveryRepository.assign` KYC gate; `listAssignableDriversByBusiness`; org routes `/organisation/tableau-de-bord/chauffeurs` (+ `/nouveau`, `/[id]` tabs); `POST /api/organisation/drivers` invites immediately.
- Tests: operational status derivation, assignable KYC, roster snapshot SQL, assign rejects pending review, Playwright drivers list/detail/add.

## 2026-08-23
- Change type: DB | API | Mobile
- Description: Courier locker-first ops slice — required drop-off photo proof, nearest-locker itinerary for active stops, in-app courier notifications (new assignment / locker blocked), WhatsApp dispatch contact (no in-app chat), 90-day history metrics. No pay, no recipient ETA, no door delivery/signature.
- Impact: `deliveries.drop_off_photo`; `POST /api/courier/deliveries/[id]/complete` requires `photoBase64`; proof GET; courier notifications routes; `NotificationRepository.notifyCourierAssigned` / `notifyCouriersLockerBlocked`; `orderLockerStops`; courier list returns 90-day `summary`.
- Tests: drop-off photo normalize, complete requires photo, history summary, assignment notify, route order, completeDropOff schema.

## 2026-08-23
- Change type: Mobile | API
- Description: First-version mobile loops — customer can confirm pickup (`collected`), courier self-signup is locked, password reset, pickup PIN screen (copy / maps / steps), WhatsApp arrived template sends the PIN, courier drop-off can fail and list incidents, camera scan + suggested compartment, notification tap opens the parcel.
- Impact: `POST /api/customer/parcels/[id]/collect`; `POST /api/courier/deliveries/[id]/fail`; complete drop-off accepts `compartmentId`; mobile onboard is customer-only; `ParcelRepository.markCollectedByCustomer`; `DeliveryRepository.fail`; issue create fails the delivery for `failed_delivery` / `locker_unavailable`; WhatsApp arrived body param 4 is the PIN.
- Tests: parcel collect, delivery fail, courier issue fail, WhatsApp PIN, register-mobile schema.

> **Note:** Entries before 2026-07-22 reference pre-refactor paths (`web-admin`, `web-platform`, `web-business`, `apps/mobile`, Prisma). Current apps are `web-manager` and `mobile-tenant`; data access uses `pg` + `db/migrations/`.

## 2026-08-21
- Change type: Frontend | API
- Description: Business Colis shows derived location and pickup-type progression (ADR-002). List/detail load pickup type + latest delivery on the server; filters are in memory; courier identity is not shown. Colis detail is an RSC (no client fetch for first paint).
- Impact: `ParcelRepository.listBusinessColis` / `findForBusiness`; `listBusinessParcels` / `loadBusinessParcelDetail`; Colis list Situation column; parcel detail Progression; `GET /api/entreprise/parcels/[id]` shares the detail loader.
- Tests: `parcel-location.test.ts`, `parcel.repository.test.ts`, `business-parcel-presenter.test.ts`.

## 2026-08-21
- Change type: Other
- Description: Stabilized the parcel vs delivery model — business Colis shows a derived location from parcel status + pickup type + latest delivery; Livraisons stays admin-only; courier identity, returns, Destinataires, and a business Livraisons nav are deferred ([ADR-002](../decisions/ADR-002.md)).
- Impact: `packages/domain/src/parcel-location.ts`; `BUSINESS_PARCEL_LOCATION_LABELS`; glossary, business-portal, roles-and-flows, brand. No UI or schema change.
- Tests: `parcel-location.test.ts`, `labels.test.ts`.

## 2026-08-21
- Change type: Other
- Description: Codified the dashboard data architecture so new screens cannot reintroduce query fan-out — `data-fetching.md` now mandates page-specific loaders, RSC lists, one profile lookup per request, and pool idle policy; agent rules treat those as PR blockers; Cursor rule `eveider-data-architecture.mdc` always applies.
- Impact: `docs/blueprint/ai/data-fetching.md`, `AGENT_RULES.md`, `README.md`, `docs/setup/auth.md`, `ADR-001.md`, `business-portal.md`, `admin-dashboard.md`, `.cursor/rules/eveider-data-architecture.mdc`.
- Tests: n/a (docs).

## 2026-08-21
- Change type: Frontend | API | Infra
- Description: Cut business-dashboard query fan-out — page-specific snapshots instead of full `loadSummary()` on home/settings/billing; Facturation no longer loads locker availability; cookie `/api/auth/me` reuses the profile from `resolveCurrentUser`; Colis and Incidents load as RSC (in-memory filters); dev pg pool keeps idle clients for 10 minutes and no longer sets `allowExitOnIdle`.
- Impact: `BusinessOnboardingRepository.getSettingsSnapshot` / `getBillingSnapshot`; `LockerRepository.listActivePickerOptions`; `loadBusinessDashboard` / `loadBusinessSettingsPageData` / `loadBusinessBillingPageData`; `/entreprise/tableau-de-bord/{colis,incidents,parametres,facturation}`; `GET /api/auth/me`; `resolvePoolIdleOptions` (dev only).
- Tests: `business-onboarding.repository.test.ts`, `locker.repository.test.ts`, `pool.test.ts`; web-manager typecheck.

## 2026-08-20
- Change type: API | Frontend
- Description: Business locker network directory — companies can see where to send parcels (location, address, capacity, available compartments, operating status) and select a pickup/destination point when creating a parcel.
- Impact: `LockerRepository.listNetworkDirectory`; domain labels `lockerNetworkLabel` / `lockerAvailableLabel` / `lockerOperatingStatus`; RSC page `/entreprise/tableau-de-bord/points`; nav module Points; `GET /api/entreprise/lockers` returns capacity + availability copy; create-parcel merchant drop-off picker + `?lockerId=` prefill; shipment-prefill includes `dropoffLockerId`.
- Tests: `packages/domain/src/locker.test.ts` (network labels, capacity, operating status); `apps/web-manager/src/lib/locker-presenter.test.ts`.

## 2026-07-22
- Change type: Infra | DB | Frontend | Mobile | Other
- Description: Technical refactor — consolidated web apps into `apps/web-manager` (admin + business + mobile APIs), renamed `apps/mobile` → `apps/mobile-tenant`, replaced Prisma with hand-written SQL repositories (`pg`), migrated schema to `db/migrations/*.sql`, removed TanStack Query from web (RSC + `src/server/` use-cases), removed Prisma client and seed scripts.
- Impact: Deleted `web-admin`, `web-platform`, `web-business`; `packages/data-access/src/db/` (pool, types, mappers); all repositories rewritten for `Queryable`; `pnpm db:migrate` + `pnpm db:seed`; admin routes `/tableau-de-bord/*`, business routes `/entreprise/tableau-de-bord/*`; mobile API host `EXPO_PUBLIC_AUTH_API_URL=http://localhost:3000`; docs `auth.md`, `ADR-001`, `supabase.md`, `db/README.md` updated.
- Tests: 47 data-access unit tests passing; web-manager typecheck + build; manual dev flows verified.

## 2026-07-21
- Change type: Frontend | API | Infra | Other
- Description: Server-first data fetching architecture — list/detail reads via Server Components + shared `src/server/` use-cases; React Query reserved for mutations/live filters; shared `LoadingSpinner` + skeletons; dashboard loads in parallel with `listRecent` (20 parcels); Prisma transaction pooler uses `connection_limit=5` in development. Migrated lockers, businesses, issues, applications, and dashboard pages to RSC.
- Impact: `packages/ui` (`LoadingSpinner`, `TableSkeleton`, `CardListSkeleton`, `DashboardOverviewSkeleton`); `web-admin/src/server/{session,business-applications,dashboard,lockers,businesses,issues}.ts`; applications, dashboard, casiers, entreprises, incidents pages are async RSC; `loading.tsx` on major dashboard routes; API list GETs call shared use-cases; `ParcelRepository.listRecent`; docs `data-fetching.md` + `AGENT_RULES.md` rewritten as mandatory pattern.
- Tests: typecheck `@eveider/ui` + `web-admin`.

## 2026-07-21
- Change type: API | Frontend | Other
- Description: Migrated KYC / business registration flows to TanStack Query and shared session patterns — admin applications list and review invalidate caches; business onboarding APIs use `requireBusinessSession` with auth cache; added `data-fetching.md` agent guide.
- Impact: `web-admin`: `use-business-applications-query.ts`, `admin-business-applications.tsx`, `admin-application-review.tsx`, `/api/businesses/applications`, `/api/businesses/[id]/decision`. `web-business`: `auth-cache.ts`, `session.ts`, `use-onboarding-summary-query.ts`, `/api/onboarding/*`, `onboarding-wizard.tsx`. Docs: `docs/blueprint/ai/data-fetching.md`, `AGENT_RULES.md`.
- Tests: deferred (pattern migration; existing typecheck gaps in unrelated files).

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