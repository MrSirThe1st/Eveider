import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import {
  isRemotePushSupported,
  parseNotificationData,
  syncPushRegistration,
  unregisterCurrentPushDevice,
  type NotificationNavPayload,
} from '../lib/push-notifications';

type NotificationRoutingValue = {
  pendingRoute: NotificationNavPayload | null;
  consumePendingRoute: () => NotificationNavPayload | null;
  unreadVersion: number;
  bumpUnread: () => void;
};

const NotificationRoutingContext = createContext<NotificationRoutingValue | null>(null);

export function useNotificationRouting() {
  const value = useContext(NotificationRoutingContext);
  if (!value) {
    throw new Error('useNotificationRouting must be used within NotificationRoutingProvider');
  }
  return value;
}

export function useNotificationRoutingOptional() {
  return useContext(NotificationRoutingContext);
}

type ProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

/**
 * Registers Expo push when authenticated and queues tap navigation until navigators are ready.
 */
export function NotificationRoutingProvider({ enabled, children }: ProviderProps) {
  const [pendingRoute, setPendingRoute] = useState<NotificationNavPayload | null>(null);
  const [unreadVersion, setUnreadVersion] = useState(0);
  const pendingRef = useRef<NotificationNavPayload | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);
  const receiveSub = useRef<Notifications.EventSubscription | null>(null);

  const queueRoute = useCallback((payload: NotificationNavPayload | null) => {
    if (!payload) return;
    pendingRef.current = payload;
    setPendingRoute(payload);
  }, []);

  const consumePendingRoute = useCallback(() => {
    const next = pendingRef.current;
    pendingRef.current = null;
    setPendingRoute(null);
    return next;
  }, []);

  const bumpUnread = useCallback(() => {
    setUnreadVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web' || !isRemotePushSupported()) return;

    let cancelled = false;

    void (async () => {
      const result = await syncPushRegistration();
      if (cancelled || !result.ok) return;

      const initial = await Notifications.getLastNotificationResponseAsync();
      if (cancelled) return;
      queueRoute(parseNotificationData(initial?.notification.request.content.data as Record<string, unknown>));
    })();

    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      queueRoute(
        parseNotificationData(response.notification.request.content.data as Record<string, unknown>),
      );
      bumpUnread();
    });

    receiveSub.current = Notifications.addNotificationReceivedListener(() => {
      bumpUnread();
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void syncPushRegistration();
        bumpUnread();
      }
    });

    return () => {
      cancelled = true;
      responseSub.current?.remove();
      receiveSub.current?.remove();
      appStateSub.remove();
    };
  }, [enabled, queueRoute, bumpUnread]);

  useEffect(() => {
    if (enabled) return;
    // Guest / signed out — do not leave tokens active for a previous session here;
    // logout path calls unregisterCurrentPushDevice explicitly before signOut.
  }, [enabled]);

  const value = useMemo(
    () => ({
      pendingRoute,
      consumePendingRoute,
      unreadVersion,
      bumpUnread,
    }),
    [pendingRoute, consumePendingRoute, unreadVersion, bumpUnread],
  );

  return (
    <NotificationRoutingContext.Provider value={value}>
      {children}
    </NotificationRoutingContext.Provider>
  );
}

export { unregisterCurrentPushDevice };
