import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getInviteConfig } from '../invitations/invite-links.js';

const BRAND_GREEN = '#09D40B';
const LOGO_CONTENT_ID = 'eveider-logo';
const LOGO_PUBLIC_PATH = '/email/eveider_logo.png';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatEmailDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-CD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getEmailAssetBaseUrl(): string {
  return getInviteConfig().webBaseUrl;
}

/** Hosted fallback (after deploy). Prefer CID attachment when sending. */
export function getEveiderLogoUrl(): string {
  return `${getEmailAssetBaseUrl()}${LOGO_PUBLIC_PATH}`;
}

export function getEveiderLogoCidSrc(): string {
  return `cid:${LOGO_CONTENT_ID}`;
}

export type EveiderLogoAttachment = {
  filename: string;
  content: Buffer;
  contentId: string;
  contentType: string;
};

/** Inline logo for Resend (`img src="cid:eveider-logo"`). */
export function getEveiderLogoAttachment(): EveiderLogoAttachment {
  const path = fileURLToPath(new URL('../../assets/eveider_logo.png', import.meta.url));
  return {
    filename: 'eveider_logo.png',
    content: readFileSync(path),
    contentId: LOGO_CONTENT_ID,
    contentType: 'image/png',
  };
}

export type BrandedEmailContent = {
  /** Short preview text shown in inbox lists */
  preheader: string;
  /** Main heading inside the card */
  heading: string;
  /** HTML paragraphs / content (already escaped where needed) */
  bodyHtml: string;
  /** Primary CTA */
  ctaLabel: string;
  ctaUrl: string;
  /** Optional footnote under the CTA */
  footnoteHtml?: string;
};

/**
 * Professional Eveider transactional email shell (table-based for clients).
 * Logo uses CID when the sender attaches `getEveiderLogoAttachment()`.
 */
export function buildBrandedEmailHtml(content: BrandedEmailContent): string {
  const logoSrc = escapeHtml(getEveiderLogoCidSrc());
  const portalUrl = escapeHtml(getEmailAssetBaseUrl());
  const ctaUrl = escapeHtml(content.ctaUrl);
  const preheader = escapeHtml(content.preheader);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Eveider</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0F172A;line-height:1.5;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="background:#0A0A0A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
              <a href="${portalUrl}" style="text-decoration:none;">
                <img
                  src="${logoSrc}"
                  width="56"
                  alt="Eveider"
                  style="display:block;margin:0 auto;border:0;outline:none;width:56px;height:auto;border-radius:10px;"
                />
              </a>
              <p style="margin:14px 0 0;font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND_GREEN};">
                Eveider
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;padding:32px 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#0F172A;">
                ${escapeHtml(content.heading)}
              </h1>
              ${content.bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px;background:${BRAND_GREEN};">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      ${escapeHtml(content.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              ${content.footnoteHtml ?? ''}
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#94A3B8;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br />
                <a href="${ctaUrl}" style="color:#64748B;word-break:break-all;">${ctaUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 16px 16px;padding:20px 28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748B;">
                Livraison intelligente · casiers · suivi
              </p>
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                <a href="${portalUrl}" style="color:#64748B;text-decoration:none;">www.eveider.com</a>
                · Si vous n’attendiez pas cet email, ignorez-le.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildBrandedEmailText(input: {
  greeting: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  closing?: string;
}): string {
  const lines = [
    input.greeting,
    '',
    ...input.paragraphs.flatMap((p) => [p, '']),
    `${input.ctaLabel} :`,
    input.ctaUrl,
    '',
    input.closing ?? '— L’équipe Eveider',
    'www.eveider.com',
  ];
  return lines.join('\n');
}
