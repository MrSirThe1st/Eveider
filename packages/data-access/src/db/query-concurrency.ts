/**
 * Process-wide gate for PostgreSQL round trips.
 *
 * Repositories must still consolidate related SQL. This limiter is a safety
 * rail for genuinely independent queries so nested Promise.all() cannot
 * checkout more connections than the shared pool can serve.
 *
 * All application queries should go through `getPool()` / `query()` so they
 * share this gate. Do not instantiate additional Pool objects or extra limiters.
 */

export type QueryConcurrencyGate = {
  readonly limit: number;
  run<T>(fn: () => Promise<T>): Promise<T>;
};

export function createQueryConcurrencyGate(limit: number): QueryConcurrencyGate {
  const max = Math.max(1, Math.floor(limit));
  let active = 0;
  const waiting: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (active < max) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      waiting.push(resolve);
    });
  }

  function release(): void {
    const next = waiting.shift();
    if (next) {
      next();
      return;
    }
    active = Math.max(0, active - 1);
  }

  return {
    limit: max,
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
}

export function resolveQueryConcurrency(poolMax: number): number {
  const configured = Number.parseInt(process.env.PG_QUERY_CONCURRENCY ?? '', 10);
  const requested = Number.isFinite(configured) && configured > 0 ? configured : 3;
  return Math.max(1, Math.min(requested, poolMax));
}
