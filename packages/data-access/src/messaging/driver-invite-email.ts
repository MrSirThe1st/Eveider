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
  appUrl: string;
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
      'Eveider vous donne accès à l’application chauffeur. Ouvrez ce lien pour activer votre compte — vous n’avez pas de mot de passe à créer.',
      'L’application n’est pas encore partout en téléchargement : le lien fonctionne aussi dans le navigateur de votre téléphone.',
      'Si vous avez déjà l’application, le même lien l’ouvre et vous connecte.',
      'Ce lien est personnel et expire rapidement. Demandez-en un nouveau à Eveider s’il ne fonctionne plus.',
      'Si vous n’attendiez pas cet email, vous pouvez l’ignorer.',
    ],
    ctaLabel: 'Activer mon accès',
    ctaUrl: input.inviteUrl,
  });

  const html = buildBrandedEmailHtml({
    preheader: 'Ouvrez ce lien pour activer votre accès chauffeur Eveider — sans mot de passe.',
    heading: 'Accès chauffeur',
    bodyHtml: `
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">
                Bonjour ${escapeHtml(name)},<br /><br />
                Eveider vous donne accès à l’application chauffeur. Ouvrez ce lien pour activer
                votre compte — vous n’avez pas de mot de passe à créer.
              </p>
              <p style="margin:0;font-size:15px;color:#334155;">
                L’application n’est pas encore partout en téléchargement : le lien fonctionne aussi
                dans le navigateur de votre téléphone.
              </p>`,
    ctaLabel: 'Activer mon accès',
    ctaUrl: input.inviteUrl,
    footnoteHtml: `<p style="margin:16px 0 0;font-size:13px;color:#64748B;">
                Si vous avez déjà l’application, <a href="${escapeHtml(input.appUrl)}" style="color:#121212;font-weight:600;">ouvrez-la avec ce lien</a>.
                Ce lien est personnel et expire rapidement.
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
