import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { getServerEnv } from '../env.js';
import {
  createQueryConcurrencyGate,
  resolveQueryConcurrency,
  type QueryConcurrencyGate,
} from './query-concurrency.js';

const { Pool } = pg;

export type Queryable = {
  query: <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: unknown[],
  ) => Promise<pg.QueryResult<T>>;
};

type GlobalPool = typeof globalThis & {
  __eveiderPgPool?: pg.Pool;
  __eveiderQueryGate?: QueryConcurrencyGate;
};

export type DbQueryTraceEntry = {
  sql: string;
  durationMs: number;
  waitingBefore: number;
};

export type DbQueryTrace = {
  label: string;
  queries: DbQueryTraceEntry[];
};

const dbQueryTrace = new AsyncLocalStorage<DbQueryTrace>();

function isDbTraceEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.PG_QUERY_LOG === '1';
}

function sqlPreview(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function extractSql(config: unknown): string {
  if (typeof config === 'string') return config;
  if (config && typeof config === 'object' && 'text' in config) {
    return String((config as { text: unknown }).text);
  }
  return '[pg query]';
}

function recordQuery(pool: pg.Pool, sql: string, durationMs: number, waitingBefore: number): void {
  const entry: DbQueryTraceEntry = {
    sql: sqlPreview(sql),
    durationMs: Math.round(durationMs),
    waitingBefore,
  };

  const trace = dbQueryTrace.getStore();
  if (trace) {
    trace.queries.push(entry);
  }

  if (!isDbTraceEnabled()) return;

  if (trace) return;

  if (process.env.PG_QUERY_LOG === '1' || durationMs >= 100 || waitingBefore > 0) {
    console.log(
      `[@eveider/data-access] query ${entry.durationMs}ms wait=${waitingBefore} pool=${pool.totalCount}/${pool.options.max ?? '?'} idle=${pool.idleCount} | ${entry.sql}`,
    );
  }
}

function logTraceSummary(trace: DbQueryTrace, pool: pg.Pool): void {
  if (!isDbTraceEnabled()) return;

  const totalMs = trace.queries.reduce((sum, query) => sum + query.durationMs, 0);
  const waited = trace.queries.filter((query) => query.waitingBefore > 0).length;
  console.log(
    `[@eveider/data-access] ${trace.label} — ${trace.queries.length} queries, ${totalMs}ms SQL, ${waited} waited for checkout, pool ${pool.totalCount}/${pool.options.max ?? '?'} idle=${pool.idleCount} waiting=${pool.waitingCount}`,
  );
  for (const [index, query] of trace.queries.entries()) {
    const wait = query.waitingBefore > 0 ? ` wait=${query.waitingBefore}` : '';
    console.log(`  ${String(index + 1).padStart(2, ' ')}. ${String(query.durationMs).padStart(4)}ms${wait}  ${query.sql}`);
  }
}

/**
 * Collects query counts/timings for a loader in development (`PG_QUERY_LOG=1` or NODE_ENV=development).
 * Request-scoped only — never caches tenant data.
 */
export async function withDbQueryTrace<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isDbTraceEnabled()) return fn();

  const trace: DbQueryTrace = { label, queries: [] };
  return dbQueryTrace.run(trace, async () => {
    try {
      return await fn();
    } finally {
      const globalStore = globalThis as GlobalPool;
      if (globalStore.__eveiderPgPool) {
        logTraceSummary(trace, globalStore.__eveiderPgPool);
      }
    }
  });
}

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

/**
 * Next.js `next dev` is a long-running process. `allowExitOnIdle` plus a
 * 20s idle timeout was dropping TLS-warmed clients between navigations.
 * Production keeps the short idle timeout (serverless / Fluid Compute).
 */
export function resolvePoolIdleOptions(nodeEnv = process.env.NODE_ENV): {
  idleTimeoutMillis: number;
  allowExitOnIdle: boolean;
} {
  if (nodeEnv === 'development') {
    return { idleTimeoutMillis: 10 * 60_000, allowExitOnIdle: false };
  }
  return { idleTimeoutMillis: 20_000, allowExitOnIdle: false };
}

/**
 * Shared Client/Pool options. pg 8.22 treats sslmode=require as verify-full;
 * Supabase's pooler cert chain fails that check and stalls until
 * connectionTimeoutMillis. `rejectUnauthorized: false` keeps TLS without
 * the verify-full hang.
 *
 * Fail checkout in ~5s so exhausted pools surface quickly instead of hanging
 * a request for 20s. This is not a substitute for reducing query fan-out.
 */
export function getPgClientConfig(connectionString: string): pg.PoolConfig {
  const isSupabase = connectionString.includes('supabase.com');
  return {
    connectionString,
    keepAlive: true,
    connectionTimeoutMillis: 5_000,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

function wrapPoolQuery(pool: pg.Pool, gate: QueryConcurrencyGate): void {
  const nativeQuery = pool.query.bind(pool) as (...args: unknown[]) => unknown;

  const wrapped = (...args: unknown[]) => {
    const sql = extractSql(args[0]);
    return gate.run(async () => {
      const waitingBefore = pool.waitingCount;
      const started = performance.now();
      try {
        return await Promise.resolve(nativeQuery(...args));
      } finally {
        recordQuery(pool, sql, performance.now() - started, waitingBefore);
      }
    });
  };

  pool.query = wrapped as typeof pool.query;
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

  const pool = new Pool({
    ...getPgClientConfig(connectionString),
    max,
    ...resolvePoolIdleOptions(),
  });

  const globalStore = globalThis as GlobalPool;
  const gate = createQueryConcurrencyGate(resolveQueryConcurrency(max));
  globalStore.__eveiderQueryGate = gate;
  wrapPoolQuery(pool, gate);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle pg client:', err);
  });

  return pool;
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
