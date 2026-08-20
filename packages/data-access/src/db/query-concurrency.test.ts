import { describe, expect, it } from 'vitest';
import { createQueryConcurrencyGate, resolveQueryConcurrency } from './query-concurrency.js';

describe('createQueryConcurrencyGate', () => {
  it('never runs more than `limit` tasks at once', async () => {
    const gate = createQueryConcurrencyGate(2);
    let inFlight = 0;
    let peak = 0;

    async function task() {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
    }

    await Promise.all(Array.from({ length: 8 }, () => gate.run(task)));

    expect(peak).toBe(2);
    expect(inFlight).toBe(0);
  });

  it('caps configured concurrency at the pool size', () => {
    const previous = process.env.PG_QUERY_CONCURRENCY;
    process.env.PG_QUERY_CONCURRENCY = '20';
    expect(resolveQueryConcurrency(5)).toBe(5);
    if (previous === undefined) {
      delete process.env.PG_QUERY_CONCURRENCY;
    } else {
      process.env.PG_QUERY_CONCURRENCY = previous;
    }
  });
});
