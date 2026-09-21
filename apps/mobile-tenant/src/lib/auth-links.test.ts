import { describe, expect, it } from 'vitest';
import {
  isDriverMagicLinkUrl,
  isPasswordResetUrl,
  isPasswordSetCallback,
  parseAuthCallbackUrl,
} from './auth-links';

describe('auth callback links', () => {
  it('detects custom-scheme reset URLs', () => {
    expect(isPasswordResetUrl('eveider://reset-password')).toBe(true);
    expect(isPasswordResetUrl('eveider://reset-password#type=recovery')).toBe(true);
    expect(isPasswordResetUrl('eveider://invite/abc')).toBe(false);
    expect(isPasswordResetUrl('eveider://auth?token_hash=abc&type=magiclink')).toBe(false);
  });

  it('detects chauffeur magic-link URLs', () => {
    expect(isDriverMagicLinkUrl('eveider://auth?token_hash=abc&type=magiclink')).toBe(true);
    expect(isDriverMagicLinkUrl('eveider://auth')).toBe(true);
    expect(isDriverMagicLinkUrl('eveider://reset-password?code=abc')).toBe(false);
  });

  it('parses PKCE code from query', () => {
    expect(parseAuthCallbackUrl('eveider://reset-password?code=abc123&type=recovery')).toEqual({
      code: 'abc123',
      accessToken: undefined,
      refreshToken: undefined,
      tokenHash: undefined,
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

  it('parses magic-link token hash', () => {
    expect(parseAuthCallbackUrl('eveider://auth?token_hash=hashed&type=magiclink')).toEqual({
      code: undefined,
      accessToken: undefined,
      refreshToken: undefined,
      tokenHash: 'hashed',
      type: 'magiclink',
    });
  });

  it('treats invite callbacks as password-set', () => {
    expect(isPasswordSetCallback({ type: 'invite' })).toBe(true);
  });
});
