import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  registerPushDevice,
  unregisterPushDevice,
} from './api';

const ANDROID_CHANNEL_ID = 'eveider_operations';

/**
 * Remote push is unavailable in Expo Go on Android (SDK 53+) and should be
 * tested with an EAS development/preview build. In Expo Go we skip all remote
 * push APIs so the rest of the app still runs.
 */
export function isRemotePushSupported(): boolean {
  if (Platform.OS === 'web') return false;
  if (isRunningInExpoGo()) return false;
  return true;
}

if (isRemotePushSupported()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export type PushRegistrationResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason:
        | 'web'
        | 'expo_go'
        | 'permission_denied'
        | 'unavailable'
        | 'register_failed';
    };

type PermissionLike = {
  granted?: boolean;
  canAskAgain?: boolean;
  status?: string;
};

/** expo-notifications PermissionResponse is not re-exported from `expo` in SDK 54 — normalize. */
function readPermission(result: unknown): { granted: boolean; canAskAgain: boolean } {
  const value = result as PermissionLike;
  const granted =
    typeof value.granted === 'boolean'
      ? value.granted
      : value.status === 'granted';
  const canAskAgain =
    typeof value.canAskAgain === 'boolean'
      ? value.canAskAgain
      : value.status === 'undetermined' || value.status == null;
  return { granted, canAskAgain };
}

function getProjectId(): string | undefined {
  const eas = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return typeof eas === 'string' && eas.length > 0 ? eas : undefined;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (!isRemotePushSupported() || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Eveider opérations',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1C1A17',
  });
}

export async function getNotificationOsGranted(): Promise<boolean> {
  if (!isRemotePushSupported()) return false;
  const current = readPermission(await Notifications.getPermissionsAsync());
  return current.granted;
}

/**
 * Request permission once (no re-prompt after denial), obtain Expo token, register with backend.
 */
export async function syncPushRegistration(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'web' };
  }
  if (!isRemotePushSupported()) {
    return { ok: false, reason: 'expo_go' };
  }

  await ensureAndroidChannel();

  let permission = readPermission(await Notifications.getPermissionsAsync());
  if (!permission.granted && permission.canAskAgain) {
    permission = readPermission(await Notifications.requestPermissionsAsync());
  }
  if (!permission.granted) {
    return { ok: false, reason: 'permission_denied' };
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[eveider:push] Missing EAS projectId');
    return { ok: false, reason: 'unavailable' };
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (error) {
    console.warn('[eveider:push] getExpoPushTokenAsync failed', error);
    return { ok: false, reason: 'unavailable' };
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const deviceId = Device.modelId ?? Device.modelName ?? null;
  const registered = await registerPushDevice({
    expoPushToken: token,
    platform,
    deviceId,
  });

  if (!registered.success) {
    console.warn('[eveider:push] register failed', registered.error);
    return { ok: false, reason: 'register_failed' };
  }

  return { ok: true, token };
}

export async function unregisterCurrentPushDevice(): Promise<void> {
  if (!isRemotePushSupported()) return;
  try {
    const projectId = getProjectId();
    let token: string | null = null;
    if (projectId) {
      try {
        const result = await Notifications.getExpoPushTokenAsync({ projectId });
        token = result.data;
      } catch {
        token = null;
      }
    }
    await unregisterPushDevice({
      expoPushToken: token,
      deviceId: Device.modelId ?? Device.modelName ?? null,
    });
  } catch (error) {
    console.warn('[eveider:push] unregister failed', error);
  }
}

export type NotificationNavPayload = {
  type: string | null;
  entityType: string | null;
  entityId: string | null;
  parcelId: string | null;
  deliveryId: string | null;
  notificationId: string | null;
};

export function parseNotificationData(
  data: Record<string, unknown> | undefined | null,
): NotificationNavPayload | null {
  if (!data || typeof data !== 'object') return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const entityType = typeof data.entity_type === 'string' ? data.entity_type : null;
  const entityId = typeof data.entity_id === 'string' ? data.entity_id : null;
  const parcelId = typeof data.parcel_id === 'string' ? data.parcel_id : null;
  const deliveryId = typeof data.delivery_id === 'string' ? data.delivery_id : null;
  const notificationId =
    typeof data.notification_id === 'string' ? data.notification_id : null;
  if (!type && !parcelId && !deliveryId && !entityId) return null;
  return { type, entityType, entityId, parcelId, deliveryId, notificationId };
}
