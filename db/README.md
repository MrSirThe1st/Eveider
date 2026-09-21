# Database migrations

SQL migrations for Eveider, applied in filename order via:

```bash
pnpm db:migrate
```

| File | Description |
|------|-------------|
| `001_20260608193000_init.sql` | Initial schema |
| `002_20260624220000_locker_map_grid.sql` | Locker grid layout |
| `003_20260625180000_locker_code_compartment_size.sql` | Locker code + compartment size |
| `004_20260627120000_parcel_invites.sql` | Parcel invites |
| `005_20260720150000_parcel_payments.sql` | Parcel payments (PawaPay) |
| `006_20260721153000_business_onboarding_kyc.sql` | Business onboarding / KYC |
| `007_20260722140000_operator_role.sql` | Add `operator` to `UserRole` enum |
| `008_20260722150000_uuid_and_timestamp_defaults.sql` | DB defaults for `id` / `updated_at` (Prisma used to set these in the client) |
| `009_20260722230000_eveider_point_types.sql` | Eveider Point types + soft capacity + commission |
| `010_20260723001000_tracking_and_point_codes.sql` | Parcel `tracking_number`, optional merchant `reference`, global EVP point codes, unique pickup PINs |
| `011_20260724001000_shipment_fields.sql` | Create Shipment fields (sender, package, payment responsibility, COD) |
| `012_20260814103000_business_access_code.sql` | Business access code |
| `013_20260814103100_delivery_pricing.sql` | Delivery pricing |
| `014_20260821150000_company_team_roles.sql` | Company team roles |
| `015_20260823140000_locker_city.sql` | Locker city |
| `016_20260823180000_delivery_drop_off_photo.sql` | Courier locker drop-off photo proof |
| `030_20260916220000_customer_return_enums.sql` | Customer-return parcel statuses, `customer_return` delivery kind, return events |
| `031_20260916220100_parcel_returns.sql` | `parcel_returns` table (Flow 3, distinct from legacy RTS) |
| `032_20260917200000_commercial_charge_kinds.sql` | Canonical charge kinds (`outbound_delivery`, `locker_collection`, `return_delivery`, `return_locker`) |
| `033_20260917200100_commercial_pricing.sql` | Zone fees on `service_areas`, Flow 2/3B global amounts, charge `payer` |
| `034_20260917210000_parcel_commercial_model.sql` | `parcels.commercial_model` (`canonical` vs `legacy`) |
| `035_20260917220000_locker_action_sessions.sql` | Hardware locker action sessions (`authorize` / `confirm` / `cancel`) |
| `036_20260919090000_locker_collection_credentials.sql` | Locker collection credential sync records (Stage IV offline collection) |
| `037_20260920140000_cities_and_zone_pricing.sql` | City parent entity, `service_areas.city_id`, `zone_pricing` (nullable = unconfigured) |
| `038_20260921100000_platform_currency.sql` | Singleton `platform_settings.platform_currency` (`USD` \| `CDF`) for new prices and charges |
| `039_20260921140000_former_platform_staff.sql` | `users.former_platform_role` + `platform_access_revoked_at` for revoked platform staff |
| `040_20260921150000_identity_documents_bucket.sql` | Private Supabase Storage bucket `identity-documents` for driver IDs and later KYC files |
| `041_20260921170000_driver_vehicle_documents.sql` | Optional `driver_vehicle_documents` files on a chauffeur dossier |

Hardware locker clients authenticate with `EVEIDER_LOCKER_API_TOKENS` (JSON map of locker UUID → secret) via `Authorization: Bearer <secret>`. The token identifies the locker; the client cannot claim another `locker_id`. Keep secrets out of git. Default authorization TTL is 180 seconds (`EVEIDER_LOCKER_ACTION_TTL_SECONDS`).

Expired deposit reservations are released by `expireLockerActionSessions()` (transactional, `FOR UPDATE SKIP LOCKED`). Invoke periodically:

```bash
curl -X POST "$ORIGIN/api/locker/maintenance/expire-sessions" \
  -H "Authorization: Bearer $EVEIDER_LOCKER_MAINTENANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Opportunistic expiry still runs on authorize / confirm / cancel / credential sync. Occupied compartments are never released by expiry. Integrity findings: `GET /api/locker/maintenance/integrity`.

Applied migrations are recorded in `schema_migrations`.

**Existing production databases** already migrated via the historical Prisma history should mark these files as applied in `schema_migrations` before running `pnpm db:migrate`, to avoid re-applying DDL.

Seed demo lockers:

```bash
pnpm db:seed
```

Wipe operational data for a from-scratch Admin UI test (keeps schema, migrations, and existing Admin logins; does **not** re-seed demo data):

```bash
EVEIDER_ALLOW_CLEAN_RESET=1 pnpm db:reset:clean
```

Development only. Refuses to run when `NODE_ENV` or `VERCEL_ENV` is `production`, or when `EVEIDER_ALLOW_CLEAN_RESET` is unset.

pnpm --filter @eveider/web-admin dev
pnpm --filter @eveider/mobile dev
pnpm --filter @eveider/web-manager dev