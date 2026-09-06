import { Resend } from 'resend';
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  formatEmailDate,
  getEveiderLogoAttachment,
} from './email-brand.js';
import { getResendConfig } from './resend-config.js';

export type SendTeamInviteEmailInput = {
  to: string;
  organizationName: string;
  roleLabel: string;
  inviteUrl: string;
  expiresAt: Date;
};

export type SendTeamInviteEmailResult = { ok: true; id: string };

export function buildTeamInviteEmail(input: SendTeamInviteEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const org = input.organizationName.trim() || 'Eveider';
  const expiry = formatEmailDate(input.expiresAt);
  const subject = `${org} vous invite sur Eveider`;

  const text = buildBrandedEmailText({
    greeting: 'Bonjour,',
    paragraphs: [
      `${org} vous invite à rejoindre son équipe Eveider en tant que ${input.roleLabel}.`,
      'Créez votre compte pour accéder au tableau de bord et collaborer avec votre équipe.',
      `Ce lien est personnel et expire le ${expiry}.`,
      'Si vous n’attendiez pas cet email, vous pouvez l’ignorer.',
    ],
    ctaLabel: 'Créer mon compte',
    ctaUrl: input.inviteUrl,
  });

  const html = buildBrandedEmailHtml({
    preheader: `${org} vous invite à rejoindre Eveider en tant que ${input.roleLabel}.`,
    heading: `Invitation à rejoindre ${org}`,
    bodyHtml: `
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">
                Bonjour,<br /><br />
                <strong>${escapeHtml(org)}</strong> vous invite à rejoindre son équipe sur Eveider
                en tant que <strong>${escapeHtml(input.roleLabel)}</strong>.
              </p>
              <p style="margin:0;font-size:15px;color:#334155;">
                Créez votre compte pour accéder au tableau de bord et collaborer avec votre équipe.
              </p>`,
    ctaLabel: 'Créer mon compte',
    ctaUrl: input.inviteUrl,
    footnoteHtml: `<p style="margin:16px 0 0;font-size:13px;color:#64748B;">
                Ce lien est personnel et expire le <strong style="color:#334155;">${escapeHtml(expiry)}</strong>.
              </p>`,
  });

  return { subject, text, html };
}

export async function sendTeamInviteEmail(
  input: SendTeamInviteEmailInput,
): Promise<SendTeamInviteEmailResult> {
  const config = getResendConfig();
  if (!config) {
    throw new Error('L’envoi d’email n’est pas configuré (RESEND_API_KEY)');
  }

  const { subject, text, html } = buildTeamInviteEmail(input);
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
