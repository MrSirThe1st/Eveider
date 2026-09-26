/** Stable notification event keys (web + mobile V1). */
export type WebNotificationType =
  | 'pickup.awaiting_assignment'
  | 'return.awaiting_assignment'
  | 'incident.opened'
  | 'org.verification_pending'
  | 'driver.verification_pending'
  | 'delivery.driver_assigned'
  | 'parcel.collected'
  | 'parcel.deposited_at_locker'
  | 'return.requested'
  | 'return.completed';

/** Mobile customer / driver event keys. */
export type MobileNotificationType =
  | 'parcel.created_for_recipient'
  | 'parcel.in_transit'
  | 'parcel.ready_for_pickup'
  | 'parcel.collected'
  | 'return.authorized'
  | 'return.deposited'
  | 'return.completed'
  | 'delivery.assigned'
  | 'return.assigned'
  | 'locker.blocked'
  | 'courier.deactivated';

export type NotificationType = WebNotificationType | MobileNotificationType;

export type WebNotificationEntityType =
  | 'parcel'
  | 'issue'
  | 'business'
  | 'driver_dossier'
  | 'parcel_return'
  | 'delivery'
  | 'locker';

export type WebNotificationAudience = 'admin_ops' | 'platform_admins' | 'business_web';

/** Events that may also send email when the user has email enabled. */
export const EMAIL_ELIGIBLE_NOTIFICATION_TYPES = new Set<WebNotificationType>([
  'incident.opened',
  'return.requested',
  'return.awaiting_assignment',
  'return.completed',
  'org.verification_pending',
  'driver.verification_pending',
]);

/** Mobile push: higher OS priority / Android channel importance. */
export const HIGH_PRIORITY_MOBILE_TYPES = new Set<MobileNotificationType>([
  'parcel.ready_for_pickup',
  'delivery.assigned',
  'return.assigned',
]);

export type EmitWebNotificationInput = {
  type: WebNotificationType;
  title: string;
  message: string;
  audience: WebNotificationAudience;
  /** Required when audience is business_web. */
  businessId?: string | null;
  entityType: WebNotificationEntityType;
  entityId: string;
  parcelId?: string | null;
  /** Stable per-recipient suffix; full key is `${dedupeKey}:${userId}`. */
  dedupeKey: string;
};

/** Direct user targeting for customer / driver (and other single-recipient) events. */
export type EmitUserNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: WebNotificationEntityType;
  entityId: string;
  parcelId?: string | null;
  businessId?: string | null;
  /** Stable key before user suffix; full key is `${dedupeKey}:${userId}`. */
  dedupeKey: string;
  /** When false, only the in-app row is written (no Expo push). Default true. */
  sendPush?: boolean;
};

export type WebNotificationRecord = {
  id: string;
  userId: string | null;
  parcelId: string | null;
  businessId: string | null;
  channel: 'in_app';
  type: NotificationType | null;
  title: string | null;
  message: string;
  entityType: WebNotificationEntityType | null;
  entityId: string | null;
  dedupeKey: string | null;
  readAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
};

export type PushDevicePlatform = 'ios' | 'android';

export type UserPushDevice = {
  id: string;
  userId: string;
  expoPushToken: string;
  platform: PushDevicePlatform;
  deviceId: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
};

export type ExpoPushPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
  priority?: 'default' | 'high';
  channelId?: string;
};

export type AdminOperationalBadges = {
  livraisons: number;
  organisations: number;
  flotte: number;
  incidents: number;
  awaitingAssignment: number;
  awaitingReturnAssignment: number;
};

export type BusinessOperationalBadges = {
  colis: number;
  awaitingHandoff: number;
  awaitingDeposit: number;
  returnsToReview: number;
  returnsToCollect: number;
};
