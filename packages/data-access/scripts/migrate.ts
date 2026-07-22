/**
 * Applies SQL files from db/migrations/ in filename order.
 * Tracks applied migrations in schema_migrations.
 *
 * Usage (from repo root):
 *   pnpm db:migrate
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { resolveDatabaseUrl } from '../src/db/pool.js';

const { Client } = pg;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MIGRATIONS_DIR = path.join(ROOT, 'db/migrations');

async function main() {
  const connectionString = resolveDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    const applied = await client.query<{ id: string }>(`SELECT id FROM schema_migrations`);
    const appliedSet = new Set(applied.rows.map((row) => row.id));

    let ran = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.info(`skip  ${file}`);
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.info(`apply ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [file]);
        await client.query('COMMIT');
        ran += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.info(`Done. Applied ${ran} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
