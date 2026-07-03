import type { PrismaClient } from '@prisma/client';
import { buildInviteLinks } from './invite-links.js';

export type SendInvitationInput = {
  token: string;
  phone: string;
  email?: string | null;
  businessName: string;
  parcelReference: string;
};

export type SendInvitationResult = {
  channel: 'simulated';
  deepLink: string;
  webLink: string;
  message: string;
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
 * Sends an invitation to a pending recipient.
 * Currently simulated (console log). Plug WhatsApp / SMS providers here later.
 */
export async function sendInvitation(input: SendInvitationInput): Promise<SendInvitationResult> {
  const links = buildInviteLinks(input.token);
  const message = buildInvitationMessage(input.businessName, links);

  // Simulated delivery — replace with WhatsApp primary, Twilio SMS fallback.
  console.info('[eveider:invitation]', {
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
  };
}

export async function recordSimulatedDelivery(
  db: PrismaClient,
  parcelId: string,
  message: string,
): Promise<void> {
  await db.notification.create({
    data: {
      parcelId,
      channel: 'sms',
      message: `[simulated] ${message}`,
      sentAt: new Date(),
    },
  });
}
