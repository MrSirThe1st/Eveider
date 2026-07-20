import { getWhatsAppConfig, normalizeWhatsAppPhone } from './whatsapp-config.js';

export type SendTemplateInput = {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams: string[];
};

export type SendTemplateResult =
  | { ok: true; messageId: string }
  | { ok: false; skipped: true; reason: 'not_configured' | 'invalid_phone' }
  | { ok: false; skipped?: false; status: number; error: string };

type GraphMessageResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; type?: string; code?: number };
};

export async function sendWhatsAppTemplate(input: SendTemplateInput): Promise<SendTemplateResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { ok: false, skipped: true, reason: 'not_configured' };
  }

  const to = normalizeWhatsAppPhone(input.to);
  if (to.length < 8) {
    return { ok: false, skipped: true, reason: 'invalid_phone' };
  }

  const languageCode = input.languageCode ?? config.templateLanguage;
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: input.bodyParams.map((text) => ({
              type: 'text',
              text: sanitizeTemplateParam(text),
            })),
          },
        ],
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as GraphMessageResponse;

  if (!response.ok) {
    const error =
      payload.error?.message ?? `WhatsApp API error (${response.status})`;
    console.error('[eveider:whatsapp] send failed', {
      status: response.status,
      error,
      template: input.templateName,
      to,
    });
    return { ok: false, status: response.status, error };
  }

  const messageId = payload.messages?.[0]?.id ?? 'unknown';
  console.info('[eveider:whatsapp] sent', {
    messageId,
    template: input.templateName,
    to,
  });

  return { ok: true, messageId };
}

/** Meta rejects empty params and newlines in body variables. */
function sanitizeTemplateParam(value: string): string {
  const cleaned = value.replace(/[\n\t\r]/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : '—';
}
