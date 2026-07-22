import { colors, radius, borders } from '@eveider/config-ui';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  fetchCustomerNotifications,
  markCustomerNotificationRead,
  type CustomerNotification,
} from '../lib/api';

type NotificationsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function NotificationsScreen({ mode, onBack }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCustomerNotifications();
    if (!silent) setLoading(false);
    setRefreshing(false);

    if (!result.success) {
      setError(result.error);
      setNotifications([]);
      return;
    }

    setNotifications(result.data.notifications);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePress(notification: CustomerNotification) {
    if (!notification.read) {
      const result = await markCustomerNotificationRead(notification.id);
      if (result.success) {
        setNotifications((items) =>
          items.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      }
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader mode={mode} title="NOTIFICATIONS" onBack={onBack} />

      {loading && !refreshing ? (
        <ActivityIndicator color={colors.secondary} style={styles.loader} />
      ) : null}

      {!loading && error ? (
        <View style={styles.feedback}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retry}>
            <Text style={styles.retryText}>RÉESSAYER</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(true);
              }}
              tintColor={colors.secondary}
            />
          }
        >
          {notifications.length === 0 ? (
            <EmptyState
              title="AUCUNE NOTIFICATION"
              message="Les mises à jour de vos colis apparaîtront ici."
            />
          ) : (
            notifications.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void handlePress(item)}
                style={[styles.card, !item.read && styles.cardUnread]}
              >
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 56,
    backgroundColor: colors.background,
  },
  loader: {
    marginTop: 24,
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  feedback: {
    gap: 12,
  },
  error: {
    color: colors.danger,
    fontWeight: '500',
  },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  retryText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    position: 'relative',
  },
  cardUnread: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  message: {
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 20,
    color: colors.secondary,
    paddingRight: 16,
  },
  date: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '500',
    color: colors.secondary,
    opacity: 0.6,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
