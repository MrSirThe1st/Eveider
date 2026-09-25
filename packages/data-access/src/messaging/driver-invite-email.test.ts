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

  it('builds a French invitation that asks the driver to set a password', () => {
    const email = buildDriverInviteEmail({
      to: 'jean@eveider.cd',
      fullName: 'Jean Coursier',
      inviteUrl: 'https://www.eveider.com/invite/chauffeur/abc',
    });

    expect(email.subject).toBe('Votre accès chauffeur Eveider');
    expect(email.text).toContain('Jean Coursier');
    expect(email.text).toContain('https://www.eveider.com/invite/chauffeur/abc');
    expect(email.text).toContain('choisir un mot de passe');
    expect(email.html).toContain('Créer mon compte');
    expect(email.html).toContain('cid:eveider-logo');
  });

  it('refuses to send without RESEND_API_KEY', async () => {
    await expect(
      sendDriverInviteEmail({
        to: 'jean@eveider.cd',
        fullName: 'Jean',
        inviteUrl: 'https://www.eveider.com/invite/chauffeur/abc',
      }),
    ).rejects.toThrow('RESEND_API_KEY');
    expect(sendMock).not.toHaveBeenCalled();
  });
});
