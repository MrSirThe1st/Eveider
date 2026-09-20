/**
 * Upserts isolated Phase 8 fixtures without wiping demo accounts.
 *
 * Usage: pnpm --filter @eveider/data-access db:seed:phase8
 */
import dns from 'node:dns';
import pg from 'pg';
import { getPgClientConfig, resolveDatabaseUrl } from '../src/db/pool.js';
import { ensurePhase8Env, resetPhase8Fixtures } from '../src/phase8/fixtures.js';

dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

async function main() {
  const url = ensurePhase8Env();
  const connectionString = resolveDatabaseUrl(url ?? undefined);
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  const client = new Client({
    ...getPgClientConfig(connectionString),
    connectionTimeoutMillis: 30_000,
  });
  await client.connect();
  try {
    await resetPhase8Fixtures(client);
    console.log('Phase 8 fixtures reset.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
