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

Applied migrations are recorded in `schema_migrations`.

**Existing production databases** already migrated via the historical Prisma history should mark these files as applied in `schema_migrations` before running `pnpm db:migrate`, to avoid re-applying DDL.

Seed demo lockers:

```bash
pnpm db:seed
```
