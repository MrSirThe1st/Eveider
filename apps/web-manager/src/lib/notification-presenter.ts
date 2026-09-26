import type { CustomerNotification } from '@eveider/data-access';

export function toNotificationDto(notification: CustomerNotification) {
  const deliveryId =
    notification.entityType === 'delivery' && notification.entityId
      ? notification.entityId
      : null;

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.readAt !== null,
    parcelId: notification.parcelId,
    parcelReference: notification.parcel?.reference ?? null,
    parcelTrackingNumber: notification.parcel?.trackingNumber ?? null,
    entityType: notification.entityType,
    entityId: notification.entityId,
    deliveryId,
    createdAt: notification.createdAt.toISOString(),
  };
}
