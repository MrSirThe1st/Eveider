/** Who/what caused a parcel operational event. */
export type ParcelEventActorType = 'user' | 'system' | 'api_key';

/**
 * Operational audit spine for a parcel lifecycle.
 * Notifications remain a delivery channel; these events answer how the parcel got here.
 */
export type ParcelEventType =
  | 'parcel.created'
  | 'parcel.status_changed'
  | 'delivery.assigned'
  | 'delivery.scanned'
  | 'delivery.drop_off_pending'
  | 'delivery.completed'
  | 'delivery.failed'
  | 'compartment.reserved'
  | 'compartment.occupied'
  | 'compartment.released'
  | 'pickup_pin.issued'
  | 'notification.sent'
  | 'notification.failed'
  | 'issue.opened';

export const PARCEL_EVENT_ACTOR_TYPES: readonly ParcelEventActorType[] = [
  'user',
  'system',
  'api_key',
] as const;

export const PARCEL_EVENT_TYPES: readonly ParcelEventType[] = [
  'parcel.created',
  'parcel.status_changed',
  'delivery.assigned',
  'delivery.scanned',
  'delivery.drop_off_pending',
  'delivery.completed',
  'delivery.failed',
  'compartment.reserved',
  'compartment.occupied',
  'compartment.released',
  'pickup_pin.issued',
  'notification.sent',
  'notification.failed',
  'issue.opened',
] as const;

/** Events forwarded to an organisation's software notification address. */
export const ORGANIZATION_NOTIFY_EVENT_TYPES: readonly ParcelEventType[] = [
  'parcel.created',
  'parcel.status_changed',
  'delivery.assigned',
  'delivery.completed',
  'delivery.failed',
  'issue.opened',
] as const;

export function isOrganizationNotifyEventType(type: ParcelEventType): boolean {
  return (ORGANIZATION_NOTIFY_EVENT_TYPES as readonly string[]).includes(type);
}
