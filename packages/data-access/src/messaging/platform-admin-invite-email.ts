import { Resend } from 'resend';
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  formatEmailDate,
  getEveiderLogoAttachment,
} from './email-brand.js';
import { getResendConfig } from './resend-config.js';

export type SendPlatformAdminInviteEmailInput = {
  to: string;
  roleLabel: string;
  inviteUrl: string;
  expiresAt: Date;
};

export type SendPlatformAdminInviteEmailResult = { ok: true; id: string };

export function buildPlatformAdminInviteEmail(
  input: SendPlatformAdminInviteEmailInput,
): { subject: string; text: string; html: string } {
  const expiry = formatEmailDate(input.expiresAt);
  const subject = 'Invitation à administrer Eveider';

  const text = buildBrandedEmailText({
    greeting: 'Bonjour,',
    paragraphs: [
      `Vous êtes invité(e) à rejoindre l’équipe d’administration Eveider en tant que ${input.roleLabel}.`,
      'Acceptez l’invitation pour accéder au tableau de bord plateforme.',
      `Ce lien est personnel et expire le ${expiry}.`,
      'Si vous n’attendiez pas cet email, vous pouvez l’ignorer.',
    ],
    ctaLabel: 'Accepter l’invitation',
    ctaUrl: input.inviteUrl,
  });

  const html = buildBrandedEmailHtml({
    preheader: `Invitation administrateur Eveider — rôle ${input.roleLabel}.`,
    heading: 'Invitation administrateur',
    bodyHtml: `
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">
                Bonjour,<br /><br />
                Vous êtes invité(e) à rejoindre l’équipe d’administration Eveider
                en tant que <strong>${escapeHtml(input.roleLabel)}</strong>.
              </p>
              <p style="margin:0;font-size:15px;color:#334155;">
                Acceptez l’invitation pour accéder au tableau de bord plateforme.
              </p>`,
    ctaLabel: 'Accepter l’invitation',
    ctaUrl: input.inviteUrl,
    footnoteHtml: `<p style="margin:16px 0 0;font-size:13px;color:#64748B;">
                Ce lien est personnel et expire le <strong style="color:#334155;">${escapeHtml(expiry)}</strong>.
              </p>`,
  });

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
  const logo = getEveiderLogoAttachment();
  const { data, error } = await resend.emails.send({
    from: config.from,
    to: input.to,
    subject,
    text,
    html,
    attachments: [logo],
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’envoyer l’email d’invitation');
  }

  return { ok: true, id: data?.id ?? '' };
}
