import { Resend } from 'resend';
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  getEveiderLogoCidSrc,
  resolveEmailLogo,
} from '../messaging/email-brand.js';
import { getResendConfig } from '../messaging/resend-config.js';

export type SendOperationalNotificationEmailInput = {
  to: string;
  title: string;
  message: string;
  actionUrl: string;
};

/**
 * Secondary delivery for high-signal web notifications.
 * Auth / invite emails must not call this path.
 */
export async function sendOperationalNotificationEmail(
  input: SendOperationalNotificationEmailInput,
): Promise<{ ok: true; id: string } | { ok: false; skipped: true } | { ok: false; error: string }> {
  const config = getResendConfig();
  if (!config) {
    return { ok: false, skipped: true };
  }

  const subject = input.title;
  const text = buildBrandedEmailText({
    greeting: 'Bonjour,',
    paragraphs: [input.message, 'Ouvrez Eveider pour voir le détail et agir.'],
    ctaLabel: 'Ouvrir Eveider',
    ctaUrl: input.actionUrl,
  });
  const brandedHtml = buildBrandedEmailHtml({
    preheader: input.message,
    heading: escapeHtml(input.title),
    bodyHtml: `
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">
                ${escapeHtml(input.message)}
              </p>
              <p style="margin:0;font-size:15px;color:#334155;">
                Ouvrez Eveider pour voir le détail et agir.
              </p>`,
    ctaLabel: 'Ouvrir Eveider',
    ctaUrl: input.actionUrl,
  });

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

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? 'Envoi e-mail impossible' };
  }
  return { ok: true, id: data.id };
}

export function resolveNotificationEmailActionUrl(input: {
  audience: 'admin_ops' | 'platform_admins' | 'business_web';
  entityType: string | null;
  entityId: string | null;
}): string {
  const base =
    process.env.INVITE_WEB_BASE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://www.eveider.com';

  if (!input.entityType || !input.entityId) {
    return input.audience === 'business_web'
      ? `${base}/organisation/tableau-de-bord`
      : `${base}/tableau-de-bord`;
  }

  if (input.audience === 'business_web') {
    if (input.entityType === 'parcel' || input.entityType === 'parcel_return') {
      return `${base}/organisation/tableau-de-bord/colis/${input.entityId}`;
    }
    if (input.entityType === 'issue') {
      return `${base}/organisation/tableau-de-bord/incidents`;
    }
    return `${base}/organisation/tableau-de-bord`;
  }

  if (input.entityType === 'parcel' || input.entityType === 'parcel_return') {
    return `${base}/tableau-de-bord/colis/${input.entityId}`;
  }
  if (input.entityType === 'issue') {
    return `${base}/tableau-de-bord/incidents`;
  }
  if (input.entityType === 'business') {
    return `${base}/tableau-de-bord/organisations/${input.entityId}/verification/dossier`;
  }
  if (input.entityType === 'driver_dossier') {
    return `${base}/tableau-de-bord/flotte`;
  }
  return `${base}/tableau-de-bord`;
}
