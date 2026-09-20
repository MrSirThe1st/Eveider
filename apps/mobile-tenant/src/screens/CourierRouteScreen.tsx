import { borders, type ColorTokens } from '@eveider/config-ui';
import { orderLockerStops } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import {
  LockerMapView,
  getCurrentCoordinates,
  openAddressSearch,
  openDirections,
} from '../components/LockerMapView';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { fetchCourierDeliveries, type CourierDelivery } from '../lib/api';
import {
  getDriverCurrentStop,
  getDriverDeliveryKindLabel,
  getDriverTrackingLabel,
  isActiveDriverDelivery,
  translateDriverError,
} from '../lib/driver-presentation';
import { openDispatcherWhatsApp } from '../lib/support';
import type { CourierStackParamList } from '../navigation/courier-params';
import { useColors } from '../theme';

type RouteStop = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  kindLabel: string;
  tracking: string;
};

export function CourierRouteScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  const route = useRoute<RouteProp<CourierStackParamList, 'Route'>>();
  const focusDeliveryId = route.params?.deliveryId;
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
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
      setError(translateDriverError(result.error));
      setDeliveries([]);
      return;
    }
    setDeliveries(result.data.deliveries);
  }, []);

  useEffect(() => {
    void load();
    void getCurrentCoordinates().then(setOrigin);
  }, [load]);

  const active = deliveries.filter(isActiveDriverDelivery);
  const focused = active.find((item) => item.id === focusDeliveryId) ?? active[0] ?? null;
  const stops = buildJobStops(active, origin);
  const mapLockers = stops
    .filter((stop) => stop.latitude != null && stop.longitude != null)
    .map((stop) => ({
      id: stop.id,
      name: stop.name,
      address: stop.address,
      latitude: stop.latitude!,
      longitude: stop.longitude!,
      availableCompartments: 1,
    }));

  return (
    <View style={styles.screen}>
      <ScreenHeader
        mode="DRIVER"
        title={t('tabs.route')}
        onBack={() => navigation.goBack()}
      />
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
          {focused ? (
            <View style={styles.focus}>
              <Text style={styles.focusKicker}>{getDriverDeliveryKindLabel(focused).toUpperCase()}</Text>
              <Text style={styles.focusTitle}>{getDriverCurrentStop(focused).name}</Text>
              <Text style={styles.focusMeta}>{getDriverTrackingLabel(focused)}</Text>
            </View>
          ) : null}

          <ActionRow
            icon="message-circle"
            label={t('courier.contactDispatch')}
            onPress={() => openDispatcherWhatsApp()}
            last
          />

          {mapLockers.length > 0 ? (
            <View style={styles.mapWrap}>
              <LockerMapView
                lockers={mapLockers}
                height={220}
                highlightLockerId={focused?.parcel.locker?.id}
              />
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
                    <Text style={styles.stopKind}>{stop.kindLabel}</Text>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopMeta}>
                      {stop.tracking}
                      {stop.address ? ` · ${stop.address}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      if (stop.latitude != null && stop.longitude != null) {
                        openDirections(stop.latitude, stop.longitude, stop.name);
                        return;
                      }
                      openAddressSearch([stop.name, stop.address].filter(Boolean).join(' '));
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('courier.openMaps')}
                  >
                    <Feather name="navigation" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function buildJobStops(
  items: CourierDelivery[],
  origin: { latitude: number; longitude: number } | null,
): RouteStop[] {
  const stops: RouteStop[] = items.map((item) => {
    const current = getDriverCurrentStop(item);
    return {
      id: item.id,
      name: current.name,
      address: current.address ?? '',
      latitude: current.latitude,
      longitude: current.longitude,
      kindLabel: getDriverDeliveryKindLabel(item),
      tracking: getDriverTrackingLabel(item),
    };
  });

  const withCoords = stops.filter((stop) => stop.latitude != null && stop.longitude != null);
  const withoutCoords = stops.filter((stop) => stop.latitude == null || stop.longitude == null);
  if (!origin || withCoords.length === 0) return [...withCoords, ...withoutCoords];

  const ranked = orderLockerStops(origin, withCoords);
  const byId = new Map(withCoords.map((stop) => [stop.id, stop]));
  return [
    ...ranked.map((stop) => byId.get(stop.id)).filter((stop): stop is RouteStop => Boolean(stop)),
    ...withoutCoords,
  ];
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
    focus: {
      borderWidth: borders.width,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 8,
    },
    focusKicker: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: colors.primary,
    },
    focusTitle: {
      marginTop: 6,
      fontSize: 18,
      fontWeight: '700',
      color: colors.secondary,
    },
    focusMeta: {
      marginTop: 4,
      fontSize: 13,
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
    stopKind: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.primary,
      textTransform: 'uppercase',
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
