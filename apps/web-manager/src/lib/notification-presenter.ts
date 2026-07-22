import type { CustomerNotification } from '@eveider/data-access';

export function toNotificationDto(notification: CustomerNotification) {
  return {
    id: notification.id,
    message: notification.message,
    read: notification.sentAt !== null,
    parcelId: notification.parcelId,
    parcelReference: notification.parcel?.reference ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}
