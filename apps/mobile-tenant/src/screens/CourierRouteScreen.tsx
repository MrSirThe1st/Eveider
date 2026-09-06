import { borders, type ColorTokens } from '@eveider/config-ui';
import { orderLockerStops } from '@eveider/domain';
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
import { ActionRow } from '../components/ActionRow';
import { AppSpinner } from '../components/AppSpinner';
import { EmptyState } from '../components/EmptyState';
import { LockerMapView, getCurrentCoordinates, openDirections } from '../components/LockerMapView';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { fetchCourierDeliveries, type CourierDelivery, type CourierHistorySummary } from '../lib/api';
import { openDispatcherWhatsApp } from '../lib/support';
import { useColors } from '../theme';

const EMPTY_SUMMARY: CourierHistorySummary = {
  days: 90,
  completed: 0,
  failed: 0,
  successRate: 0,
};

const ACTIVE_STATUSES = ['assigned', 'scanned', 'drop_off_pending'] as const;

type RouteStop = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  parcelCount: number;
};

export function CourierRouteScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [summary, setSummary] = useState<CourierHistorySummary>(EMPTY_SUMMARY);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCourierDeliveries();
    if (!silent) setLoading(false);
    setRefreshing(false);
    if (!result.success) {
      setError(result.error);
      setDeliveries([]);
      return;
    }
    setDeliveries(result.data.deliveries);
    setSummary(result.data.summary ?? EMPTY_SUMMARY);
  }, []);

  useEffect(() => {
    void load();
    void getCurrentCoordinates().then(setOrigin);
  }, [load]);

  const active = deliveries.filter((d) =>
    (ACTIVE_STATUSES as readonly string[]).includes(d.status),
  );
  const stops = buildRouteStops(active, origin);
  const mapLockers = stops
    .filter((stop) => stop.latitude != null && stop.longitude != null)
    .map((stop) => ({
      id: stop.id,
      name: stop.name,
      address: stop.address,
      latitude: stop.latitude!,
      longitude: stop.longitude!,
      availableCompartments: stop.parcelCount,
    }));

  return (
    <View style={styles.screen}>
      <ScreenHeader mode="COURSIER" title={t('tabs.route')} />
      {loading && !refreshing ? <AppSpinner /> : null}
      {!loading && error ? (
        <View style={styles.body}>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton label={t('common.retry')} onPress={() => void load()} />
        </View>
      ) : null}
      {!loading && !error ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(true);
              }}
              tintColor={colors.secondary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>
              {t('courier.summaryLabel', { days: summary.days })}
            </Text>
            <Text style={styles.summaryText}>
              {t('courier.summaryText', {
                completed: summary.completed,
                failed: summary.failed,
                rate: summary.successRate,
              })}
            </Text>
          </View>

          <ActionRow
            icon="message-circle"
            label={t('courier.contactDispatch')}
            onPress={() => openDispatcherWhatsApp()}
            last
          />

          {mapLockers.length > 0 ? (
            <View style={styles.mapWrap}>
              <LockerMapView lockers={mapLockers} height={220} />
            </View>
          ) : null}

          {stops.length === 0 ? (
            <EmptyState title={t('courier.emptyTitle')} message={t('courier.emptyMessage')} />
          ) : (
            <View style={styles.stops}>
              <Text style={styles.section}>{t('courier.viewRoute')}</Text>
              {stops.map((stop, index) => (
                <View key={stop.id} style={styles.stopRow}>
                  <View style={styles.stopIndex}>
                    <Text style={styles.stopIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stopBody}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopMeta}>
                      {stop.parcelCount} colis{stop.address ? ` · ${stop.address}` : ''}
                    </Text>
                  </View>
                  {stop.latitude != null && stop.longitude != null ? (
                    <Pressable
                      onPress={() => openDirections(stop.latitude!, stop.longitude!, stop.name)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('courier.openMaps')}
                    >
                      <Feather name="navigation" size={18} color={colors.primary} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function buildRouteStops(
  items: CourierDelivery[],
  origin: { latitude: number; longitude: number } | null,
): RouteStop[] {
  const byLocker = new Map<string, RouteStop>();
  for (const item of items) {
    const locker = item.parcel.locker;
    if (!locker) continue;
    const existing = byLocker.get(locker.id);
    if (existing) {
      existing.parcelCount += 1;
      continue;
    }
    byLocker.set(locker.id, {
      id: locker.id,
      name: locker.name,
      address: locker.address,
      latitude: locker.latitude,
      longitude: locker.longitude,
      parcelCount: 1,
    });
  }

  const stops = [...byLocker.values()];
  if (!origin) return stops;
  return orderLockerStops(origin, stops);
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
      gap: 8,
    },
    body: {
      padding: 20,
      gap: 12,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
    },
    summary: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    summaryText: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
    mapWrap: {
      marginTop: 8,
      marginBottom: 8,
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    section: {
      marginTop: 8,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    stops: {
      marginTop: 4,
    },
    stopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    stopIndex: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    stopIndexText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.onPrimary,
    },
    stopBody: {
      flex: 1,
    },
    stopName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    stopMeta: {
      marginTop: 3,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
  });
}
