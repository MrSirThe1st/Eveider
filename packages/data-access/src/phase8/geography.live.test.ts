import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { db } from '../db/index.js';
import { ensurePhase8Env } from './fixtures.js';

const live = Boolean(ensurePhase8Env());
const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../db/migrations');
const migration037 = '037_20260920140000_cities_and_zone_pricing.sql';

describe('Phase 1 geography migration file', () => {
  it('does not rewrite historical parcel_charges', () => {
    const sql = readFileSync(resolve(migrationsDir, migration037), 'utf8');
    expect(sql).not.toMatch(/UPDATE\s+parcel_charges/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+parcel_charges/i);
    expect(sql).not.toMatch(/INSERT\s+INTO\s+parcel_charges/i);
  });

  it('ships numbered SQL migrations through 037', () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();
    expect(files.some((name) => name.startsWith('037_'))).toBe(true);
  });
});

describe.skipIf(!live)('Phase 1 geography backfill', () => {
  it('maps every service area to a city and a zone_pricing row', async () => {
    const unmapped = await db.query(
      `SELECT COUNT(*)::int AS count FROM service_areas WHERE city_id IS NULL`,
    );
    expect(unmapped.rows[0]?.count).toBe(0);

    const missingPricing = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM service_areas sa
       LEFT JOIN zone_pricing zp ON zp.zone_id = sa.id
       WHERE zp.zone_id IS NULL`,
    );
    expect(missingPricing.rows[0]?.count).toBe(0);
  });

  it('keeps holding-zone UUIDs and does not unzone existing lockers', async () => {
    const holding = await db.query(
      `SELECT sa.code, sa.id, c.code AS city_code
       FROM service_areas sa
       JOIN cities c ON c.id = sa.city_id
       WHERE sa.code IN ('KIN', 'LSH', 'KWZ')
       ORDER BY sa.code`,
    );
    expect(holding.rows.map((row) => row.code)).toEqual(['KIN', 'KWZ', 'LSH']);
    expect(holding.rows.every((row) => String(row.city_code) === String(row.code))).toBe(true);

    const unzoned = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM lockers
       WHERE type = 'SMART_LOCKER'
         AND status <> 'archived'
         AND archived_at IS NULL
         AND service_area_id IS NULL`,
    );
    expect(unzoned.rows[0]?.count).toBe(0);
  });
});
