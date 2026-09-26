import { borders, type ColorTokens } from '@eveider/config-ui';
import { orderLockerStops } from '@eveider/domain';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ResolveDestinationModal } from '../components/AddressPlacesField';
import { AppSpinner } from '../components/AppSpinner';
import { DriverEmptyState } from '../components/DriverEmptyState';
import { DriverSecondaryAction } from '../components/DriverSecondaryAction';
import { DriverSummaryCard } from '../components/DriverSummaryCard';
import {
  LockerMapView,
  getCurrentCoordinates,
  openDirections,
  openMultiStopDirections,
  openStopDirections,
} from '../components/LockerMapView';
import { PrimaryButton } from '../components/PrimaryButton';
import { RouteStopRow } from '../components/RouteStopRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { fetchCourierDeliveries, type CourierDelivery } from '../lib/api';
import {
  buildDriverRouteLegs,
  isActiveDriverDelivery,
  summarizeDriverRoute,
  translateDriverError,
  type DriverRouteLeg,
} from '../lib/driver-presentation';
import { openDispatcherWhatsApp } from '../lib/support';
import type { CourierStackParamList } from '../navigation/courier-params';
import { useColors } from '../theme';

export function CourierRouteScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveQuery, setResolveQuery] = useState<string | null>(null);

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
  const stops = orderRouteLegs(buildDriverRouteLegs(active), origin);
  const summary = summarizeDriverRoute(stops);
  const nextStop = stops[0] ?? null;
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

  function startFullRoute() {
    const located = stops.filter(
      (stop): stop is DriverRouteLeg & { latitude: number; longitude: number } =>
        stop.latitude != null && stop.longitude != null,
    );
    if (located.length === 0) {
      const first = stops[0];
      if (first) {
        openStopDirections({
          latitude: first.latitude,
          longitude: first.longitude,
          name: first.name,
          address: first.address,
          onNeedResolve: setResolveQuery,
        });
      }
      return;
    }
    openMultiStopDirections(
      located.map((stop) => ({
        latitude: stop.latitude,
        longitude: stop.longitude,
        name: stop.name,
      })),
    );
  }

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
          {stops.length > 0 ? (
            <DriverSummaryCard
              variant="route"
              title={t('tabs.route')}
              subtitle={t('courier.routeSummary', {
                stops: summary.stopCount,
                parcels: summary.parcelCount,
              })}
            />
          ) : null}

          {nextStop ? (
            <View style={styles.nextBlock}>
              <Text style={styles.nextKicker}>{t('courier.nextStop')}</Text>
              <Text style={styles.nextTitle} numberOfLines={2}>
                {nextStop.kindLabel}
                <Text style={styles.nextSep}> · </Text>
                {nextStop.name}
              </Text>
              <Text style={styles.nextAction}>{nextStop.actionLabel}</Text>
              {nextStop.address ? (
                <Text style={styles.nextAddress} numberOfLines={2}>
                  {nextStop.address}
                </Text>
              ) : null}
            </View>
          ) : null}

          {mapLockers.length > 0 ? (
            <View style={styles.mapWrap}>
              <LockerMapView
                lockers={mapLockers}
                height={240}
                highlightLockerId={nextStop?.id}
              />
            </View>
          ) : null}

          {stops.length === 0 ? (
            <DriverEmptyState
              title={t('courier.emptyTitle')}
              message={t('courier.emptyMessage')}
              actionLabel={t('courier.contactDispatch')}
              onAction={() => openDispatcherWhatsApp()}
            />
          ) : (
            <View style={styles.stops}>
              {stops.map((stop, index) => (
                <RouteStopRow
                  key={stop.id}
                  index={index + 1}
                  kindLabel={stop.kindLabel}
                  name={stop.name}
                  actionLabel={stop.actionLabel}
                  address={stop.address}
                  dueAt={stop.dueAt}
                  highlight={index === 0}
                  navigateLabel={t('courier.openMaps')}
                  onNavigate={() => {
                    openStopDirections({
                      latitude: stop.latitude,
                      longitude: stop.longitude,
                      name: stop.name,
                      address: stop.address,
                      onNeedResolve: setResolveQuery,
                    });
                  }}
                />
              ))}

              <PrimaryButton
                label={t('courier.startRoute')}
                onPress={startFullRoute}
                variant="brand"
              />

              <DriverSecondaryAction
                label={t('courier.contactDispatch')}
                onPress={() => openDispatcherWhatsApp()}
              />
            </View>
          )}
        </ScrollView>
      ) : null}
      <ResolveDestinationModal
        open={resolveQuery != null}
        initialQuery={resolveQuery ?? ''}
        onClose={() => setResolveQuery(null)}
        onResolved={(place) =>
          openDirections(place.latitude, place.longitude, place.label)
        }
      />
    </View>
  );
}

function orderRouteLegs(
  legs: DriverRouteLeg[],
  origin: { latitude: number; longitude: number } | null,
): DriverRouteLeg[] {
  const collects = legs.filter((leg) => leg.kind === 'collect');
  const deposits = legs.filter((leg) => leg.kind === 'deposit');

  function orderGroup(
    group: DriverRouteLeg[],
    from: { latitude: number; longitude: number } | null,
  ) {
    const withCoords = group.filter((stop) => stop.latitude != null && stop.longitude != null);
    const withoutCoords = group.filter((stop) => stop.latitude == null || stop.longitude == null);
    if (!from || withCoords.length === 0) return [...withCoords, ...withoutCoords];
    const ranked = orderLockerStops(from, withCoords);
    const byId = new Map(withCoords.map((stop) => [stop.id, stop]));
    return [
      ...ranked
        .map((stop) => byId.get(stop.id))
        .filter((stop): stop is DriverRouteLeg => Boolean(stop)),
      ...withoutCoords,
    ];
  }

  const orderedCollects = orderGroup(collects, origin);
  const lastCollect = [...orderedCollects]
    .reverse()
    .find((stop) => stop.latitude != null && stop.longitude != null);
  const depositOrigin =
    lastCollect && lastCollect.latitude != null && lastCollect.longitude != null
      ? { latitude: lastCollect.latitude, longitude: lastCollect.longitude }
      : origin;
  return [...orderedCollects, ...orderGroup(deposits, depositOrigin)];
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
      gap: 10,
    },
    body: {
      padding: 20,
      gap: 12,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
    },
    nextBlock: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
    },
    nextKicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    nextTitle: {
      marginTop: 6,
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
    },
    nextSep: {
      fontWeight: '500',
      color: colors.textMuted,
    },
    nextAction: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    nextAddress: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    mapWrap: {
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    stops: {
      marginTop: 4,
      gap: 10,
    },
  });
}
