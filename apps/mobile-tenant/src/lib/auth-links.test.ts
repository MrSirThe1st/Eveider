import { describe, expect, it } from 'vitest';
import {
  isPasswordResetUrl,
  isPasswordSetCallback,
  parseAuthCallbackUrl,
} from './auth-links';

describe('auth callback links', () => {
  it('detects custom-scheme reset URLs', () => {
    expect(isPasswordResetUrl('eveider://reset-password')).toBe(true);
    expect(isPasswordResetUrl('eveider://reset-password#type=recovery')).toBe(true);
    expect(isPasswordResetUrl('eveider://invite/abc')).toBe(false);
  });

  it('parses PKCE code from query', () => {
    expect(parseAuthCallbackUrl('eveider://reset-password?code=abc123&type=recovery')).toEqual({
      code: 'abc123',
      accessToken: undefined,
      refreshToken: undefined,
      type: 'recovery',
    });
  });

  it('parses implicit tokens from hash', () => {
    const parsed = parseAuthCallbackUrl(
      'eveider://reset-password#access_token=tok&refresh_token=ref&type=recovery',
    );
    expect(parsed.accessToken).toBe('tok');
    expect(parsed.refreshToken).toBe('ref');
    expect(parsed.type).toBe('recovery');
    expect(isPasswordSetCallback(parsed)).toBe(true);
  });

  it('treats invite callbacks as password-set', () => {
    expect(isPasswordSetCallback({ type: 'invite' })).toBe(true);
  });
});
