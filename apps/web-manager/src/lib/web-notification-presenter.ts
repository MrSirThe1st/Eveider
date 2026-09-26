import type { WebInboxItem } from '@eveider/data-access';

export type WebNotificationDto = {
  id: string;
  type: string | null;
  title: string;
  message: string;
  read: boolean;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  parcelId: string | null;
  parcelReference: string | null;
  createdAt: string;
};

export function resolveNotificationHref(
  notification: Pick<WebInboxItem, 'entityType' | 'entityId' | 'parcelId' | 'type'>,
  surface: 'admin' | 'organization',
): string | null {
  const entityType = notification.entityType;
  const entityId = notification.entityId ?? notification.parcelId;
  if (!entityType || !entityId) return null;

  if (surface === 'organization') {
    if (entityType === 'parcel' || entityType === 'parcel_return') {
      return `/organisation/tableau-de-bord/colis/${entityId}`;
    }
    if (entityType === 'issue') {
      return `/organisation/tableau-de-bord/incidents`;
    }
    return `/organisation/tableau-de-bord`;
  }

  if (entityType === 'parcel' || entityType === 'parcel_return') {
    return `/tableau-de-bord/colis/${entityId}`;
  }
  if (entityType === 'issue') {
    return `/tableau-de-bord/incidents`;
  }
  if (entityType === 'business') {
    return `/tableau-de-bord/organisations/${entityId}/verification/dossier`;
  }
  if (entityType === 'driver_dossier') {
    return `/tableau-de-bord/flotte`;
  }
  return `/tableau-de-bord`;
}

export function toWebNotificationDto(
  notification: WebInboxItem,
  surface: 'admin' | 'organization',
): WebNotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title?.trim() || 'Notification',
    message: notification.message,
    read: notification.readAt !== null,
    href: resolveNotificationHref(notification, surface),
    entityType: notification.entityType,
    entityId: notification.entityId,
    parcelId: notification.parcelId,
    parcelReference: notification.parcel?.reference ?? notification.parcel?.trackingNumber ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function formatRelativeTimeFr(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const deltaSec = Math.round((then - now) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (abs < 60) return rtf.format(deltaSec, 'second');
  const mins = Math.round(deltaSec / 60);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, 'hour');
  const days = Math.round(hours / 24);
  return rtf.format(days, 'day');
}
