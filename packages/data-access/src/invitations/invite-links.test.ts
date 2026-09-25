import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildDriverAppInviteLink,
  buildDriverInviteLink,
  getInviteConfig,
  resolveDriverInviteWebBaseUrl,
} from './invite-links.js';

describe('driver invite links', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INVITE_WEB_BASE_URL: 'https://www.eveider.com',
      INVITE_DEEP_LINK_SCHEME: 'eveider',
    };
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('builds a web magic-link landing and matching app deep link', () => {
    expect(getInviteConfig()).toEqual({
      deepLinkScheme: 'eveider',
      webBaseUrl: 'https://www.eveider.com',
    });
    expect(buildDriverInviteLink('hash/value')).toBe(
      'https://www.eveider.com/invite/chauffeur/hash%2Fvalue',
    );
    expect(buildDriverAppInviteLink('hash/value')).toBe(
      'eveider://auth?token_hash=hash%2Fvalue&type=magiclink',
    );
  });

  it('uses the local portal for chauffeur invites so verifyOtp runs on the same host', () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = 'http://localhost:3000';
    expect(resolveDriverInviteWebBaseUrl()).toBe('http://localhost:3000');
    expect(buildDriverInviteLink('abc')).toBe('http://localhost:3000/invite/chauffeur/abc');
  });
});
