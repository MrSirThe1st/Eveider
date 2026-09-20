import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { db } from '../db/index.js';
import { ensurePhase8Env } from './fixtures.js';

const live = Boolean(ensurePhase8Env());
const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../db/migrations');

describe('Phase 8 migration baseline', () => {
  it('ships numbered SQL migrations through 037', () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();
    expect(files.some((name) => name.startsWith('037_'))).toBe(true);
    expect(files[0]?.startsWith('001_')).toBe(true);
  });
});

describe.skipIf(!live)('Phase 8 applied migrations', () => {
  it('has 001–037 recorded on the connected database', async () => {
    const applied = await db.query<{ id: string }>(`SELECT id FROM schema_migrations ORDER BY id`);
    const ids = applied.rows.map((row) => row.id);
    expect(ids.some((id) => id.startsWith('037_'))).toBe(true);
    expect(ids.some((id) => id.startsWith('001_'))).toBe(true);
  });
});
