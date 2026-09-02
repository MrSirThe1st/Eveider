import { isOrganizationNotifyEventType, type ParcelEventType } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapOrganizationNotificationEndpoint } from '../db/mappers.js';
import type { ParcelEvent } from '../db/types.js';
import { notificationSignatureHeader } from './secrets.js';

export type OrganizationNotificationPayload = {
  id: string;
  type: string;
  createdAt: string;
  parcel: {
    id: string;
    trackingNumber: string;
    status: string;
  } | null;
  previousParcelStatus: string | null;
  newParcelStatus: string | null;
  previousDeliveryStatus: string | null;
  newDeliveryStatus: string | null;
};

export type NotificationDeliveryResult = {
  ok: boolean;
  httpStatus: number | null;
  error: string | null;
};

const NOTIFY_TIMEOUT_MS = 5_000;

export function isAllowedNotificationUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function buildOrganizationNotificationPayload(
  event: ParcelEvent,
  parcel: { id: string; trackingNumber: string; status: string } | null,
): OrganizationNotificationPayload {
  return {
    id: event.id,
    type: event.eventType,
    createdAt: event.createdAt.toISOString(),
    parcel,
    previousParcelStatus: event.previousParcelStatus,
    newParcelStatus: event.newParcelStatus,
    previousDeliveryStatus: event.previousDeliveryStatus,
    newDeliveryStatus: event.newDeliveryStatus,
  };
}

export async function deliverSignedNotification(input: {
  url: string;
  signingSecret: string;
  eventType: string;
  payload: unknown;
}): Promise<NotificationDeliveryResult> {
  const body = JSON.stringify(input.payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);
  try {
    const response = await fetch(input.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Eveider-Signature': notificationSignatureHeader(input.signingSecret, body),
        'X-Eveider-Event': input.eventType,
        'User-Agent': 'Eveider/1.0',
      },
      body,
      signal: controller.signal,
      redirect: 'manual',
    });
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, httpStatus: response.status, error: null };
    }
    return {
      ok: false,
      httpStatus: response.status,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === 'AbortError'
          ? 'Délai dépassé'
          : error.message
        : 'Envoi impossible';
    return { ok: false, httpStatus: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort outbound notify after a parcel event insert.
 * Runs after the INSERT; if the caller is still inside an uncommitted
 * transaction, the remote software may see the event before commit (v1: no outbox).
 */
export async function notifyOrganizationOfParcelEvent(
  db: Queryable,
  event: ParcelEvent,
): Promise<void> {
  if (!isOrganizationNotifyEventType(event.eventType as ParcelEventType)) {
    return;
  }

  const lookup = await db.query(
    `SELECT e.*,
            p.tracking_number AS parcel_tracking_number,
            p.status AS parcel_status
     FROM parcels p
     JOIN organization_notification_endpoints e ON e.business_id = p.business_id
     WHERE p.id = $1
       AND e.status = 'active'
       AND e.url IS NOT NULL
       AND btrim(e.url) <> ''
     LIMIT 1`,
    [event.parcelId],
  );
  const row = lookup.rows[0];
  if (!row) return;

  const endpoint = mapOrganizationNotificationEndpoint(row);
  if (!endpoint.url || !isAllowedNotificationUrl(endpoint.url)) return;

  const payload = buildOrganizationNotificationPayload(event, {
    id: event.parcelId,
    trackingNumber: String(row.parcel_tracking_number),
    status: String(row.parcel_status),
  });

  const result = await deliverSignedNotification({
    url: endpoint.url,
    signingSecret: endpoint.signingSecret,
    eventType: event.eventType,
    payload,
  });

  await db.query(
    `INSERT INTO organization_notification_deliveries (
       endpoint_id, parcel_id, event_id, event_type, status, http_status, error
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      endpoint.id,
      event.parcelId,
      event.id,
      event.eventType,
      result.ok ? 'sent' : 'failed',
      result.httpStatus,
      result.error,
    ],
  );
}
