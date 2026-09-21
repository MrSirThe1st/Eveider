import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildDriverAppInviteLink,
  buildDriverInviteLink,
  getInviteConfig,
} from './invite-links.js';

describe('driver invite links', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INVITE_WEB_BASE_URL: 'https://www.eveider.com',
      INVITE_DEEP_LINK_SCHEME: 'eveider',
    };
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
});
