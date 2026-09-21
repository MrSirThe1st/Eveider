import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDriverInviteEmail, sendDriverInviteEmail } from './driver-invite-email.js';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('driver invite email', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    sendMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('builds a French magic-link invitation without asking for a password', () => {
    const email = buildDriverInviteEmail({
      to: 'jean@eveider.cd',
      fullName: 'Jean Coursier',
      inviteUrl: 'https://www.eveider.com/invite/chauffeur/abc',
      appUrl: 'eveider://auth?token_hash=abc&type=magiclink',
    });

    expect(email.subject).toBe('Votre accès chauffeur Eveider');
    expect(email.text).toContain('Jean Coursier');
    expect(email.text).toContain('https://www.eveider.com/invite/chauffeur/abc');
    expect(email.text).toContain('vous n’avez pas de mot de passe à créer');
    expect(email.html).toContain('Activer mon accès');
    expect(email.html).toContain('cid:eveider-logo');
  });

  it('refuses to send without RESEND_API_KEY', async () => {
    await expect(
      sendDriverInviteEmail({
        to: 'jean@eveider.cd',
        fullName: 'Jean',
        inviteUrl: 'https://www.eveider.com/invite/chauffeur/abc',
        appUrl: 'eveider://auth?token_hash=abc&type=magiclink',
      }),
    ).rejects.toThrow('RESEND_API_KEY');
    expect(sendMock).not.toHaveBeenCalled();
  });
});
