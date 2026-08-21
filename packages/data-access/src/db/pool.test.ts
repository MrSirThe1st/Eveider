import { describe, expect, it } from 'vitest';
import { resolvePoolIdleOptions } from './pool.js';

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
