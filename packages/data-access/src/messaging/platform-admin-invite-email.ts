import { Resend } from 'resend';
import { getResendConfig } from './resend-config.js';

export type SendPlatformAdminInviteEmailInput = {
  to: string;
  roleLabel: string;
  inviteUrl: string;
  expiresAt: Date;
};

export type SendPlatformAdminInviteEmailResult = { ok: true; id: string };

function formatExpiry(date: Date): string {
  return new Intl.DateTimeFormat('fr-CD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPlatformAdminInviteEmail(
  input: SendPlatformAdminInviteEmailInput,
): { subject: string; text: string; html: string } {
  const expiry = formatExpiry(input.expiresAt);
  const subject = 'Invitation administrateur Eveider';
  const text =
    `Vous êtes invité(e) à rejoindre l’équipe d’administration Eveider en tant que ${input.roleLabel}.\n\n` +
    `Acceptez l’invitation : ${input.inviteUrl}\n\n` +
    `Ce lien expire le ${expiry}.`;
  const html = `<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Inter, system-ui, sans-serif; color: #121212; line-height: 1.5;">
  <p>Vous êtes invité(e) à rejoindre l’équipe d’administration Eveider en tant que <strong>${escapeHtml(input.roleLabel)}</strong>.</p>
  <p><a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#09D40B;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Accepter l’invitation</a></p>
  <p style="color:#64748B;font-size:13px;">Ou ouvrez ce lien : ${escapeHtml(input.inviteUrl)}</p>
  <p style="color:#64748B;font-size:13px;">Ce lien expire le ${escapeHtml(expiry)}.</p>
</body>
</html>`;
  return { subject, text, html };
}

export async function sendPlatformAdminInviteEmail(
  input: SendPlatformAdminInviteEmailInput,
): Promise<SendPlatformAdminInviteEmailResult> {
  const config = getResendConfig();
  if (!config) {
    throw new Error('L’envoi d’email n’est pas configuré (RESEND_API_KEY)');
  }

  const { subject, text, html } = buildPlatformAdminInviteEmail(input);
  const resend = new Resend(config.apiKey);
  const { data, error } = await resend.emails.send({
    from: config.from,
    to: input.to,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’envoyer l’email d’invitation');
  }

  return { ok: true, id: data?.id ?? '' };
}
