/**
 * Seeds demo Kinshasa lockers and compartments.
 * Usage: pnpm db:seed
 */
import { getPool, resolveDatabaseUrl } from '../src/db/pool.js';

const KINSHASA_LOCKERS = [
  {
    code: 'KIN-001',
    name: 'EVEIDER GOMBE',
    address: 'Avenue du Commerce, Gombe, Kinshasa',
    latitude: -4.3052,
    longitude: 15.3089,
  },
  {
    code: 'KIN-002',
    name: 'EVEIDER LIMETE',
    address: 'Boulevard Lumumba, Limete, Kinshasa',
    latitude: -4.3381,
    longitude: 15.3123,
  },
  {
    code: 'KIN-003',
    name: 'EVEIDER NGALIEMA',
    address: 'UPN, Ngaliema, Kinshasa',
    latitude: -4.4012,
    longitude: 15.2298,
  },
] as const;

const COMPARTMENT_LABELS = ['A1', 'A2', 'B1'] as const;

async function main() {
  if (!resolveDatabaseUrl()) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = getPool();

  try {
    for (const locker of KINSHASA_LOCKERS) {
      const existing = await pool.query(`SELECT id FROM lockers WHERE name = $1 LIMIT 1`, [
        locker.name,
      ]);

      let lockerId: string;
      if (existing.rows[0]) {
        lockerId = String(existing.rows[0].id);
      } else {
        const inserted = await pool.query(
          `INSERT INTO lockers (code, name, address, latitude, longitude, status, rows, columns)
           VALUES ($1, $2, $3, $4, $5, 'active', 3, 3)
           RETURNING id`,
          [locker.code, locker.name, locker.address, locker.latitude, locker.longitude],
        );
        lockerId = String(inserted.rows[0]!.id);
      }

      for (const label of COMPARTMENT_LABELS) {
        await pool.query(
          `INSERT INTO compartments (locker_id, label, size, status)
           VALUES ($1, $2, 'medium', 'available')
           ON CONFLICT (locker_id, label) DO NOTHING`,
          [lockerId, label],
        );
      }
    }

    const lockerCount = await pool.query(`SELECT COUNT(*)::int AS count FROM lockers`);
    const compartmentCount = await pool.query(`SELECT COUNT(*)::int AS count FROM compartments`);
    console.log(
      `Seed complete: ${lockerCount.rows[0]?.count ?? 0} lockers, ${compartmentCount.rows[0]?.count ?? 0} compartments`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
