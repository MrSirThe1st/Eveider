import type { ParcelStatus } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { buildParcelPickupLink } from '../invitations/invite-links.js';
import { getWhatsAppConfig } from './whatsapp-config.js';
import { sendWhatsAppTemplate } from './whatsapp-client.js';

const WHATSAPP_STATUSES: ParcelStatus[] = ['in_transit', 'ready_for_pickup'];

/**
 * Sends the customer WhatsApp template for parcel lifecycle events.
 * Failures are logged and never thrown — parcel status updates must not roll back.
 */
export async function sendParcelStatusWhatsApp(
  db: Queryable,
  parcelId: string,
  newStatus: ParcelStatus,
): Promise<void> {
  if (!WHATSAPP_STATUSES.includes(newStatus)) return;

  const config = getWhatsAppConfig();
  if (!config) {
    console.info('[eveider:whatsapp] skipped — not configured', { parcelId, newStatus });
    return;
  }

  const parcelResult = await db.query(
    `SELECT p.*, b.name AS business_name, l.name AS locker_name, l.address AS locker_address,
            i.token AS invite_token
     FROM parcels p
     JOIN businesses b ON b.id = p.business_id
     LEFT JOIN lockers l ON l.id = p.locker_id
     LEFT JOIN parcel_invites i ON i.parcel_id = p.id
     WHERE p.id = $1
     LIMIT 1`,
    [parcelId],
  );
  const parcel = parcelResult.rows[0];
  if (!parcel?.recipient_phone) return;

  const templateName =
    newStatus === 'in_transit' ? config.inTransitTemplate : config.arrivedTemplate;

  const duplicate = await db.query(
    `SELECT id FROM notifications
     WHERE parcel_id = $1 AND channel = 'sms' AND message LIKE $2
     LIMIT 1`,
    [parcelId, `[whatsapp:${templateName}]%`],
  );
  if (duplicate.rows[0]) return;

  const customerName = String(parcel.recipient_name ?? '').trim() || 'Client';
  const lockerLabel =
    String(parcel.locker_name ?? '').trim() ||
    String(parcel.locker_address ?? '').trim() ||
    'casier Eveider';
  const businessName = String(parcel.business_name ?? '').trim() || 'Eveider';

  const bodyParams =
    newStatus === 'in_transit'
      ? [customerName, String(parcel.reference), businessName, lockerLabel]
      : [
          customerName,
          String(parcel.reference),
          lockerLabel,
          buildParcelPickupLink(parcel.invite_token ? String(parcel.invite_token) : undefined, {
            reference: String(parcel.reference),
            phone: String(parcel.recipient_phone),
          }),
        ];

  const result = await sendWhatsAppTemplate({
    to: String(parcel.recipient_phone),
    templateName,
    bodyParams,
  });

  if (result.ok === false && result.skipped) {
    console.info('[eveider:whatsapp] skipped', { reason: result.reason, parcelId, newStatus });
    return;
  }

  if (result.ok === false) {
    await db.query(
      `INSERT INTO notifications (parcel_id, user_id, channel, message, sent_at)
       VALUES ($1, $2, 'sms', $3, NULL)`,
      [parcelId, parcel.customer_id ?? null, `[whatsapp:${templateName}] FAILED ${result.error}`],
    );
    return;
  }

  await db.query(
    `INSERT INTO notifications (parcel_id, user_id, channel, message, sent_at)
     VALUES ($1, $2, 'sms', $3, NOW())`,
    [parcelId, parcel.customer_id ?? null, `[whatsapp:${templateName}] ${bodyParams.join(' · ')}`],
  );
}
