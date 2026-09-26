import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppSpinner } from '../components/AppSpinner';
import { EmptyState } from '../components/EmptyState';
import { ScreenScaffold } from '../components/ScreenHeader';
import {
  fetchCustomerNotifications,
  fetchCourierNotifications,
  markCustomerNotificationRead,
  markCustomerNotificationsReadAll,
  markCourierNotificationRead,
  markCourierNotificationsReadAll,
  type CustomerNotification,
} from '../lib/api';
import {
  formatNotificationRelativeTime,
  groupNotificationsByRecency,
  presentNotification,
} from '../lib/notification-presentation';
import { useColors } from '../theme';

type NotificationsScreenProps = {
  mode: 'CLIENT' | 'DRIVER';
  onBack: () => void;
  onOpenParcel?: (parcelId: string) => void;
  onOpenDelivery?: (deliveryId: string) => void;
  onOpenPreferences?: () => void;
};

export function NotificationsScreen({
  mode,
  onBack,
  onOpenParcel,
  onOpenDelivery,
  onOpenPreferences,
}: NotificationsScreenProps) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCourier = mode === 'DRIVER';
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      const result = isCourier
        ? await fetchCourierNotifications()
        : await fetchCustomerNotifications();
      if (!silent) setLoading(false);
      setRefreshing(false);

      if (!result.success) {
        setError(result.error);
        setNotifications([]);
        return;
      }

      setNotifications(result.data.notifications);
    },
    [isCourier],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(
    () =>
      groupNotificationsByRecency(notifications, {
        today: t('notifications.today'),
        yesterday: t('notifications.yesterday'),
        week: t('notifications.thisWeek'),
        earlier: t('notifications.earlier'),
      }),
    [notifications, t],
  );

  const hasUnread = notifications.some((item) => !item.read);

  async function handlePress(notification: CustomerNotification) {
    if (!notification.read) {
      const result = isCourier
        ? await markCourierNotificationRead(notification.id)
        : await markCustomerNotificationRead(notification.id);
      if (result.success) {
        setNotifications((items) =>
          items.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      }
    }

    if (isCourier && notification.deliveryId) {
      onOpenDelivery?.(notification.deliveryId);
      return;
    }
    if (notification.parcelId) {
      onOpenParcel?.(notification.parcelId);
    }
  }

  async function handleMarkAllRead() {
    const result = isCourier
      ? await markCourierNotificationsReadAll()
      : await markCustomerNotificationsReadAll();
    if (result.success) {
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    }
  }

  return (
    <ScreenScaffold title={t('profile.notifications')} onBack={onBack}>
      <View style={styles.container}>
        {onOpenPreferences ? (
          <Pressable
            onPress={onOpenPreferences}
            style={styles.prefsRow}
            accessibilityRole="button"
          >
            <View style={styles.prefsText}>
              <Text style={styles.prefsLabel}>{t('profile.notificationPrefs')}</Text>
              <Text style={styles.prefsHint}>{t('profile.notificationPrefsSubtitle')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {loading && !refreshing ? <AppSpinner /> : null}

        {!loading && error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
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
                title={t('notifications.emptyTitle')}
                message={
                  isCourier
                    ? t('notifications.emptyCourier')
                    : t('notifications.emptyCustomer')
                }
              />
            ) : (
              groups.map((group, groupIndex) => (
                <View key={group.key} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupLabel}>{group.label}</Text>
                    {hasUnread && groupIndex === 0 ? (
                      <Pressable
                        onPress={() => void handleMarkAllRead()}
                        hitSlop={8}
                        accessibilityRole="button"
                      >
                        <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.groupList}>
                    {group.items.map((item, index) => {
                      const presented = presentNotification(item);
                      const last = index === group.items.length - 1;
                      return (
                        <View key={item.id}>
                          <Pressable
                            onPress={() => void handlePress(item)}
                            style={[styles.row, !item.read && styles.rowUnread]}
                            accessibilityRole="button"
                          >
                            <View style={styles.iconWrap}>
                              <Feather
                                name={presented.icon}
                                size={14}
                                color={!item.read ? colors.secondary : colors.textMuted}
                              />
                            </View>
                            <View style={styles.rowBody}>
                              <View style={styles.rowTop}>
                                <Text
                                  style={[styles.title, !item.read && styles.titleUnread]}
                                  numberOfLines={1}
                                >
                                  {presented.title}
                                </Text>
                                {!item.read ? <View style={styles.unreadDot} /> : null}
                              </View>
                              {presented.context ? (
                                <Text style={styles.context} numberOfLines={1}>
                                  {presented.context}
                                </Text>
                              ) : null}
                              {presented.detail ? (
                                <Text style={styles.detail} numberOfLines={1}>
                                  {presented.detail}
                                </Text>
                              ) : null}
                              <Text style={styles.date}>
                                {formatNotificationRelativeTime(item.createdAt, i18n.language)}
                              </Text>
                            </View>
                          </Pressable>
                          {!last ? <View style={styles.separator} /> : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : null}
      </View>
    </ScreenScaffold>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 0,
      backgroundColor: colors.background,
    },
    prefsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
      paddingVertical: 12,
      borderBottomWidth: borders.width,
      borderBottomColor: colors.border,
    },
    prefsText: {
      flex: 1,
    },
    prefsLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    prefsHint: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textMuted,
    },
    markAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    list: {
      gap: 18,
      paddingBottom: 28,
      paddingTop: 8,
    },
    group: {
      gap: 6,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 2,
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    groupList: {
      backgroundColor: colors.surface,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
      backgroundColor: colors.surface,
    },
    rowUnread: {
      backgroundColor: colors.surface,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
      backgroundColor: colors.surfaceMuted,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      flex: 1,
      fontWeight: '600',
      fontSize: 14,
      lineHeight: 19,
      color: colors.secondary,
    },
    titleUnread: {
      fontWeight: '700',
    },
    context: {
      fontWeight: '600',
      fontSize: 13,
      lineHeight: 18,
      color: colors.secondary,
    },
    detail: {
      fontWeight: '500',
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    date: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    separator: {
      height: borders.width,
      backgroundColor: colors.border,
      marginLeft: 40,
    },
    feedback: {
      gap: 12,
      paddingTop: 12,
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
  });
}
