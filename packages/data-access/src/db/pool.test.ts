import { describe, expect, it } from 'vitest';
import { ensureTransactionPoolerParams, resolveDatabaseUrl, resolvePoolIdleOptions } from './pool.js';

describe('resolvePoolIdleOptions', () => {
  it('keeps a warm pool in development without allowExitOnIdle', () => {
    expect(resolvePoolIdleOptions('development')).toEqual({
      idleTimeoutMillis: 10 * 60_000,
      allowExitOnIdle: false,
    });
  });

  it('does not change production idle behavior', () => {
    expect(resolvePoolIdleOptions('production')).toEqual({
      idleTimeoutMillis: 20_000,
      allowExitOnIdle: false,
    });
  });
});

describe('resolveDatabaseUrl', () => {
  it('rewrites session pooler port to transaction pooler', () => {
    const url =
      'postgresql://postgres.ref:pass@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
    expect(resolveDatabaseUrl(url)).toBe(
      'postgresql://postgres.ref:pass@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    );
  });

  it('adds pgbouncer=true for transaction pooler URLs', () => {
    const url =
      'postgresql://postgres.ref:pass@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
    expect(ensureTransactionPoolerParams(url)).toBe(`${url}?pgbouncer=true`);
  });

  it('does not duplicate pgbouncer param', () => {
    const url =
      'postgresql://postgres.ref:pass@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    expect(ensureTransactionPoolerParams(url)).toBe(url);
  });
});
