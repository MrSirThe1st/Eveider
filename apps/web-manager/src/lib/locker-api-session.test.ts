import { afterEach, describe, expect, it } from 'vitest';
import { requireLockerApi } from './locker-api-session';

describe('requireLockerApi', () => {
  const original = process.env.EVEIDER_LOCKER_API_TOKENS;

  afterEach(() => {
    if (original === undefined) delete process.env.EVEIDER_LOCKER_API_TOKENS;
    else process.env.EVEIDER_LOCKER_API_TOKENS = original;
  });

  it('binds the bearer token to a single locker identity', () => {
    process.env.EVEIDER_LOCKER_API_TOKENS = JSON.stringify({
      'locker-1': 'secret-a',
      'locker-2': 'secret-b',
    });
    const request = new Request('http://localhost/api/locker/actions/authorize', {
      headers: { authorization: 'Bearer secret-a' },
    });
    expect(requireLockerApi(request)).toEqual({ lockerId: 'locker-1' });
  });

  it('rejects a missing or unknown token', () => {
    process.env.EVEIDER_LOCKER_API_TOKENS = JSON.stringify({ 'locker-1': 'secret-a' });
    expect(requireLockerApi(new Request('http://localhost/api/locker/actions/authorize'))).toEqual({
      error: 'LOCKER_AUTH_REQUIRED',
      status: 401,
    });
    const request = new Request('http://localhost/api/locker/actions/authorize', {
      headers: { authorization: 'Bearer secret-b' },
    });
    expect(requireLockerApi(request)).toEqual({
      error: 'LOCKER_AUTH_REQUIRED',
      status: 401,
    });
  });
});
