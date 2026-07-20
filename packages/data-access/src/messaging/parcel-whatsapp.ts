import type { ParcelStatus } from '@eveider/domain';
import type { PrismaClient } from '@prisma/client';
import { buildParcelPickupLink } from '../invitations/invite-links.js';
import { getWhatsAppConfig } from './whatsapp-config.js';
import { sendWhatsAppTemplate } from './whatsapp-client.js';

const WHATSAPP_STATUSES: ParcelStatus[] = ['in_transit', 'ready_for_pickup'];

/**
 * Sends the customer WhatsApp template for parcel lifecycle events.
 * Failures are logged and never thrown — parcel status updates must not roll back.
 */
export async function sendParcelStatusWhatsApp(
  db: PrismaClient,
  parcelId: string,
  newStatus: ParcelStatus,
): Promise<void> {
  if (!WHATSAPP_STATUSES.includes(newStatus)) return;

  const config = getWhatsAppConfig();
  if (!config) {
    console.info('[eveider:whatsapp] skipped — not configured', { parcelId, newStatus });
    return;
  }

  const parcel = await db.parcel.findUnique({
    where: { id: parcelId },
    include: {
      business: { select: { name: true } },
      locker: { select: { name: true, address: true } },
      invite: { select: { token: true } },
    },
  });
  if (!parcel?.recipientPhone) return;

  const templateName =
    newStatus === 'in_transit' ? config.inTransitTemplate : config.arrivedTemplate;

  const duplicate = await db.notification.findFirst({
    where: {
      parcelId,
      channel: 'sms',
      message: { startsWith: `[whatsapp:${templateName}]` },
    },
  });
  if (duplicate) return;

  const customerName = parcel.recipientName?.trim() || 'Client';
  const lockerLabel =
    parcel.locker?.name?.trim() ||
    parcel.locker?.address?.trim() ||
    'casier Eveider';
  const businessName = parcel.business.name?.trim() || 'Eveider';

  const bodyParams =
    newStatus === 'in_transit'
      ? [customerName, parcel.reference, businessName, lockerLabel]
      : [
          customerName,
          parcel.reference,
          lockerLabel,
          buildParcelPickupLink(parcel.invite?.token, {
            reference: parcel.reference,
            phone: parcel.recipientPhone,
          }),
        ];

  const result = await sendWhatsAppTemplate({
    to: parcel.recipientPhone,
    templateName,
    bodyParams,
  });

  if (result.ok === false && result.skipped) {
    console.info('[eveider:whatsapp] skipped', { reason: result.reason, parcelId, newStatus });
    return;
  }

  if (result.ok === false) {
    await db.notification.create({
      data: {
        parcelId,
        userId: parcel.customerId,
        channel: 'sms',
        message: `[whatsapp:${templateName}] FAILED ${result.error}`,
        sentAt: null,
      },
    });
    return;
  }

  await db.notification.create({
    data: {
      parcelId,
      userId: parcel.customerId,
      channel: 'sms',
      message: `[whatsapp:${templateName}] ${bodyParams.join(' · ')}`,
      sentAt: new Date(),
    },
  });
}
