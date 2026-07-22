import pg from 'pg';
import { getServerEnv } from '../env.js';

const { Pool } = pg;

export type Queryable = {
  query: <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: unknown[],
  ) => Promise<pg.QueryResult<T>>;
};

type GlobalPool = typeof globalThis & {
  __eveiderPgPool?: pg.Pool;
};

/**
 * Prefer Supabase transaction pooler (6543) for serverless/HMR.
 * Session pooler (5432) has a tiny shared client cap.
 */
export function resolveDatabaseUrl(url = process.env.DATABASE_URL): string | undefined {
  if (!url) return undefined;

  let resolved = url;
  const isSupabasePooler = resolved.includes('pooler.supabase.com');
  const forceSessionPooler = process.env.PG_USE_SESSION_POOLER === '1';

  if (isSupabasePooler && !forceSessionPooler && resolved.includes(':5432')) {
    resolved = resolved.replace(':5432/', ':6543/');
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[@eveider/data-access] Rewrote DATABASE_URL :5432 → :6543 (transaction pooler). ' +
          'Set PG_USE_SESSION_POOLER=1 to keep session mode.',
      );
    }
  }

  return resolved;
}

function createPool(): pg.Pool {
  const env = getServerEnv();
  const connectionString = resolveDatabaseUrl(env.DATABASE_URL);
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const max =
    Number.parseInt(process.env.PG_POOL_MAX ?? '', 10) ||
    (process.env.NODE_ENV === 'development' ? 5 : 3);

  return new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): pg.Pool {
  const globalStore = globalThis as GlobalPool;
  if (!globalStore.__eveiderPgPool) {
    globalStore.__eveiderPgPool = createPool();
  }
  return globalStore.__eveiderPgPool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(
  fn: (client: Queryable) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Lightweight db handle injected into repositories. */
export const db: Queryable = {
  query: <T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) =>
    query<T>(text, values),
};
