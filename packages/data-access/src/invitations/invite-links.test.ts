import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildDriverInviteLink, getInviteConfig } from './invite-links.js';

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

  it('builds a production web invite landing from a DB token', () => {
    expect(getInviteConfig()).toEqual({
      deepLinkScheme: 'eveider',
      webBaseUrl: 'https://www.eveider.com',
    });
    expect(buildDriverInviteLink('hash/value')).toBe(
      'https://www.eveider.com/invite/chauffeur/hash%2Fvalue',
    );
  });

  it('keeps using INVITE_WEB_BASE_URL even when the portal is localhost', () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = 'http://localhost:3000';
    expect(buildDriverInviteLink('abc')).toBe('https://www.eveider.com/invite/chauffeur/abc');
  });
});
