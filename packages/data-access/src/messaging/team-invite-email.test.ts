import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTeamInviteEmail, sendTeamInviteEmail } from './team-invite-email.js';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('team invite email', () => {
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

  it('builds a French invitation with the join URL', () => {
    const email = buildTeamInviteEmail({
      to: 'regie@shop.cd',
      organizationName: 'Boutique Kenya',
      roleLabel: 'Dispatcher',
      inviteUrl: 'http://localhost:3000/invite/equipe/abc',
      expiresAt: new Date('2026-09-10T12:00:00.000Z'),
    });

    expect(email.subject).toContain('Boutique Kenya');
    expect(email.text).toContain('Dispatcher');
    expect(email.text).toContain('http://localhost:3000/invite/equipe/abc');
    expect(email.html).toContain('Créer mon compte');
  });

  it('refuses to send without RESEND_API_KEY', async () => {
    await expect(
      sendTeamInviteEmail({
        to: 'regie@shop.cd',
        organizationName: 'Boutique Kenya',
        roleLabel: 'Dispatcher',
        inviteUrl: 'http://localhost:3000/invite/equipe/abc',
        expiresAt: new Date('2026-09-10T12:00:00.000Z'),
      }),
    ).rejects.toThrow('RESEND_API_KEY');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends through Resend when configured', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM_EMAIL = 'Eveider <noreply@eveider.com>';
    sendMock.mockResolvedValue({ data: { id: 'email_1' }, error: null });

    const result = await sendTeamInviteEmail({
      to: 'admin@shop.cd',
      organizationName: 'Boutique Kenya',
      roleLabel: 'Administrateur',
      inviteUrl: 'https://www.eveider.com/invite/equipe/abc',
      expiresAt: new Date('2026-09-10T12:00:00.000Z'),
    });

    expect(result).toEqual({ ok: true, id: 'email_1' });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Eveider <noreply@eveider.com>',
        to: 'admin@shop.cd',
        subject: expect.stringContaining('Boutique Kenya'),
      }),
    );
  });
});
