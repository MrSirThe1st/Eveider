import { afterEach, describe, expect, it } from 'vitest';
import {
  lockerMaintenanceTokenMatches,
  parseLockerApiTokens,
  resolveLockerIdForApiToken,
} from './auth.js';

describe('locker API tokens', () => {
  const original = process.env.EVEIDER_LOCKER_API_TOKENS;

  afterEach(() => {
    if (original === undefined) delete process.env.EVEIDER_LOCKER_API_TOKENS;
    else process.env.EVEIDER_LOCKER_API_TOKENS = original;
  });

  it('maps a bearer token to exactly one locker id', () => {
    const tokens = parseLockerApiTokens(
      JSON.stringify({
        'locker-1': 'secret-a',
        'locker-2': 'secret-b',
      }),
    );
    expect(resolveLockerIdForApiToken('secret-a', tokens)).toBe('locker-1');
    expect(resolveLockerIdForApiToken('secret-b', tokens)).toBe('locker-2');
    expect(resolveLockerIdForApiToken('secret-c', tokens)).toBeNull();
  });

  it('returns empty map for missing or invalid env', () => {
    expect(parseLockerApiTokens(undefined)).toEqual({});
    expect(parseLockerApiTokens('not-json')).toEqual({});
  });

  it('matches the maintenance token without treating a locker token as maintenance', () => {
    const original = process.env.EVEIDER_LOCKER_MAINTENANCE_TOKEN;
    process.env.EVEIDER_LOCKER_MAINTENANCE_TOKEN = 'maint-secret';
    expect(lockerMaintenanceTokenMatches('maint-secret')).toBe(true);
    expect(lockerMaintenanceTokenMatches('secret-a')).toBe(false);
    if (original === undefined) delete process.env.EVEIDER_LOCKER_MAINTENANCE_TOKEN;
    else process.env.EVEIDER_LOCKER_MAINTENANCE_TOKEN = original;
  });
});
