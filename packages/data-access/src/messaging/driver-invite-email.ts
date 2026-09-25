import { Resend } from 'resend';
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  getEveiderLogoCidSrc,
  resolveEmailLogo,
} from './email-brand.js';
import { getResendConfig } from './resend-config.js';

export type SendDriverInviteEmailInput = {
  to: string;
  fullName: string;
  inviteUrl: string;
};

export type SendDriverInviteEmailResult = { ok: true; id: string };

export function buildDriverInviteEmail(input: SendDriverInviteEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const name = input.fullName.trim() || 'chauffeur';
  const subject = 'Votre accès chauffeur Eveider';

  const text = buildBrandedEmailText({
    greeting: `Bonjour ${name},`,
    paragraphs: [
      'Eveider vous invite à rejoindre l’équipe chauffeur. Ouvrez ce lien pour créer votre compte et choisir un mot de passe.',
      'Ensuite, connectez-vous avec votre email et ce mot de passe sur le portail Eveider.',
      'Ce lien est personnel et expire dans 14 jours. Demandez-en un nouveau à Eveider s’il ne fonctionne plus.',
      'Si vous n’attendiez pas cet email, vous pouvez l’ignorer.',
    ],
    ctaLabel: 'Créer mon compte',
    ctaUrl: input.inviteUrl,
  });

  const html = buildBrandedEmailHtml({
    preheader: 'Créez votre compte chauffeur Eveider et choisissez un mot de passe.',
    heading: 'Accès chauffeur',
    bodyHtml: `
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">
                Bonjour ${escapeHtml(name)},<br /><br />
                Eveider vous invite à rejoindre l’équipe chauffeur. Ouvrez ce lien pour créer
                votre compte et choisir un mot de passe.
              </p>
              <p style="margin:0;font-size:15px;color:#334155;">
                Ensuite, connectez-vous avec votre email et ce mot de passe sur le portail Eveider.
              </p>`,
    ctaLabel: 'Créer mon compte',
    ctaUrl: input.inviteUrl,
    footnoteHtml: `<p style="margin:16px 0 0;font-size:13px;color:#64748B;">
                Ce lien est personnel et expire dans 14 jours.
              </p>`,
  });

  return { subject, text, html };
}

export async function sendDriverInviteEmail(
  input: SendDriverInviteEmailInput,
): Promise<SendDriverInviteEmailResult> {
  const config = getResendConfig();
  if (!config) {
    throw new Error('L’envoi d’email n’est pas configuré (RESEND_API_KEY)');
  }

  const { subject, text, html: brandedHtml } = buildDriverInviteEmail(input);
  const logo = resolveEmailLogo();
  const resend = new Resend(config.apiKey);
  const { data, error } = await resend.emails.send({
    from: config.from,
    to: input.to,
    subject,
    text,
    html: brandedHtml.replaceAll(getEveiderLogoCidSrc(), logo.src),
    attachments: logo.attachments,
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’envoyer l’email d’invitation');
  }

  return { ok: true, id: data?.id ?? '' };
}
