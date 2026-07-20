import type { PrismaClient } from '@prisma/client';
import { getWhatsAppConfig } from '../messaging/whatsapp-config.js';
import { sendWhatsAppTemplate } from '../messaging/whatsapp-client.js';
import { buildInviteLinks } from './invite-links.js';

export type SendInvitationInput = {
  token: string;
  phone: string;
  email?: string | null;
  businessName: string;
  parcelReference: string;
};

export type SendInvitationResult = {
  channel: 'whatsapp' | 'simulated';
  deepLink: string;
  webLink: string;
  message: string;
  templateName?: string;
  ok: boolean;
};

const INVITE_EXPIRY_DAYS = 30;

export function getInviteExpiryDate(from = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);
  return expires;
}

function buildInvitationMessage(businessName: string, links: { deepLink: string; webLink: string }) {
  return (
    `${businessName} vous a envoyé un colis via Eveider.\n\n` +
    `Téléchargez l'application :\n${links.webLink}\n\n` +
    `Ou ouvrez directement :\n${links.deepLink}`
  );
}

/**
 * Sends an invitation to a pending recipient via WhatsApp when configured,
 * otherwise logs to console for manual sharing in dev.
 */
export async function sendInvitation(input: SendInvitationInput): Promise<SendInvitationResult> {
  const links = buildInviteLinks(input.token);
  const message = buildInvitationMessage(input.businessName, links);
  const config = getWhatsAppConfig();

  if (!config) {
    console.info('[eveider:invitation:simulated]', {
      phone: input.phone,
      email: input.email ?? null,
      business: input.businessName,
      parcelReference: input.parcelReference,
      deepLink: links.deepLink,
      webLink: links.webLink,
      message,
    });

    return {
      channel: 'simulated',
      deepLink: links.deepLink,
      webLink: links.webLink,
      message,
      ok: true,
    };
  }

  const templateName = config.inviteTemplate;
  const bodyParams = [input.businessName.trim() || 'Eveider', links.webLink];

  const result = await sendWhatsAppTemplate({
    to: input.phone,
    templateName,
    bodyParams,
  });

  if (result.ok === false && result.skipped) {
    console.info('[eveider:invitation] skipped', {
      reason: result.reason,
      phone: input.phone,
      parcelReference: input.parcelReference,
    });
    return {
      channel: 'whatsapp',
      templateName,
      deepLink: links.deepLink,
      webLink: links.webLink,
      message: result.reason,
      ok: false,
    };
  }

  if (result.ok === false) {
    console.error('[eveider:invitation] send failed', {
      error: result.error,
      phone: input.phone,
      parcelReference: input.parcelReference,
      template: templateName,
    });
    return {
      channel: 'whatsapp',
      templateName,
      deepLink: links.deepLink,
      webLink: links.webLink,
      message: result.error,
      ok: false,
    };
  }

  console.info('[eveider:invitation] sent', {
    phone: input.phone,
    parcelReference: input.parcelReference,
    template: templateName,
  });

  return {
    channel: 'whatsapp',
    templateName,
    deepLink: links.deepLink,
    webLink: links.webLink,
    message: bodyParams.join(' · '),
    ok: true,
  };
}

export async function recordInviteDelivery(
  db: PrismaClient,
  parcelId: string,
  delivery: SendInvitationResult,
): Promise<void> {
  if (delivery.channel === 'whatsapp' && delivery.templateName) {
    const prefix = `[whatsapp:${delivery.templateName}]`;
    await db.notification.create({
      data: {
        parcelId,
        channel: 'sms',
        message: delivery.ok ? `${prefix} ${delivery.message}` : `${prefix} FAILED ${delivery.message}`,
        sentAt: delivery.ok ? new Date() : null,
      },
    });
    return;
  }

  await db.notification.create({
    data: {
      parcelId,
      channel: 'sms',
      message: `[simulated] ${delivery.message}`,
      sentAt: new Date(),
    },
  });
}
