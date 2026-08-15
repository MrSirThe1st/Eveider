/**
 * Assign EVB- access codes to active businesses missing one.
 *
 * Usage (from repo root):
 *   pnpm --filter @eveider/data-access exec dotenv -e ../../.env -- tsx scripts/backfill-business-access-codes.ts
 */
import { generateBusinessAccessCode } from '@eveider/domain';
import pg from 'pg';
import { resolveDatabaseUrl } from '../src/db/pool.js';

const { Client } = pg;

async function allocateUniqueCode(client: pg.Client): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = generateBusinessAccessCode();
    const existing = await client.query(
      `SELECT id FROM businesses WHERE access_code = $1 LIMIT 1`,
      [candidate],
    );
    if (!existing.rows[0]) return candidate;
  }
  throw new Error('Impossible de générer un code d’accès entreprise unique');
}

async function main() {
  const connectionString = resolveDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const missing = await client.query<{ id: string; name: string }>(
      `SELECT id, name
       FROM businesses
       WHERE status = 'active'
         AND (access_code IS NULL OR access_code = '')
       ORDER BY created_at ASC`,
    );

    if (missing.rows.length === 0) {
      console.info('No active businesses without access_code.');
      return;
    }

    let updated = 0;
    for (const business of missing.rows) {
      const accessCode = await allocateUniqueCode(client);
      await client.query(
        `UPDATE businesses SET access_code = $1, updated_at = NOW() WHERE id = $2`,
        [accessCode, business.id],
      );
      console.info(`assigned ${accessCode} → ${business.name} (${business.id})`);
      updated += 1;
    }

    console.info(`Done. Updated ${updated} business(es).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
