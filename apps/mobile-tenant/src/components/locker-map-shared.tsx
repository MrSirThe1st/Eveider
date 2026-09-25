import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { formatDistanceKm, KINSHASA_CENTER } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CustomerLocker } from '../lib/api';
import { AppSpinner } from './AppSpinner';
import { useColors } from '../theme';

const LOCKER_THUMB = require('../assets/locker2.png');

export type LockerMapViewProps = {
  lockers: CustomerLocker[];
  selectedLockerId?: string;
  onSelectLocker?: (lockerId: string) => void;
  highlightLockerId?: string;
  height?: number;
  onRequestRecenter?: () => void;
  recenterToken?: number;
};

type LockerSelectPanelProps = {
  lockers: CustomerLocker[];
  selectedLockerId: string;
  onSelectLocker: (lockerId: string) => void;
  onViewDetails?: (locker: CustomerLocker) => void;
  loading?: boolean;
};

export function LockerSelectPanel({
  lockers,
  selectedLockerId,
  onSelectLocker,
  onViewDetails,
  loading,
}: LockerSelectPanelProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createLockerMapStyles(colors), [colors]);
  if (loading) {
    return <AppSpinner />;
  }

  return (
    <View style={styles.list}>
      {lockers.map((locker) => {
        const selected = locker.id === selectedLockerId;
        const available = locker.availableSlots ?? locker.availableCompartments;
        const hours =
          locker.type === 'SMART_LOCKER' ? t('points.hoursSmart') : t('points.hoursPartner');
        const distance =
          locker.distanceKm != null ? formatDistanceKm(locker.distanceKm) : null;

        return (
          <Pressable
            key={locker.id}
            onPress={() => onSelectLocker(locker.id)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            <View style={styles.cardTop}>
              <Image source={LOCKER_THUMB} style={styles.thumb} resizeMode="cover" />
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {locker.name}
                  </Text>
                  {distance ? (
                    <View style={styles.distancePill}>
                      <Text style={styles.distanceText}>{distance}</Text>
                    </View>
                  ) : null}
                  {!selected ? (
                    <Feather name="chevron-right" size={18} color={colors.textMuted} />
                  ) : null}
                </View>
                <Text style={styles.cardAddress} numberOfLines={2}>
                  {locker.address}
                </Text>
                <View style={styles.hoursRow}>
                  <View style={styles.hoursDot} />
                  <Text style={styles.hoursText}>{hours}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="grid" size={13} color={colors.textMuted} />
                  <Text style={styles.cardMeta}>
                    {t('points.compartmentsAvailable', { count: available })}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="package" size={13} color={colors.textMuted} />
                  <Text style={styles.cardMeta}>{t('points.services')}</Text>
                </View>
              </View>
            </View>

            {selected ? (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => openDirections(locker.latitude, locker.longitude, locker.name)}
                  style={styles.secondaryBtn}
                >
                  <Feather name="navigation" size={14} color={colors.secondary} />
                  <Text style={styles.secondaryBtnText}>{t('points.directions')}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    onViewDetails
                      ? onViewDetails(locker)
                      : openAddressSearch(`${locker.name} ${locker.address}`)
                  }
                  style={styles.primaryBtn}
                >
                  <Feather name="maximize-2" size={14} color={colors.onPrimary} />
                  <Text style={styles.primaryBtnText}>{t('points.viewDetails')}</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const LOCATION_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location-timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function getCurrentCoordinates() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return KINSHASA_CENTER;
    }

    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        return {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        };
      }
    } catch {
      // Fall through to a live reading.
    }

    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LOCATION_TIMEOUT_MS,
    );

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return KINSHASA_CENTER;
  }
}

export function openDirections(latitude: number, longitude: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodedLabel}`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  void Linking.openURL(url);
}

export function openAddressSearch(query: string) {
  const encoded = encodeURIComponent(query.trim());
  if (!encoded) return;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${encoded}`
      : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  void Linking.openURL(url);
}

export function useLockerMapStyles() {
  const colors = useColors();
  return useMemo(() => createLockerMapStyles(colors), [colors]);
}

export function createLockerMapStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: borders.width,
      borderColor: colors.border,
    },
    list: {
      gap: 10,
      marginTop: 4,
    },
    card: {
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 12,
      backgroundColor: colors.surface,
    },
    cardSelected: {
      borderColor: colors.primary,
    },
    cardTop: {
      flexDirection: 'row',
      gap: 12,
    },
    thumb: {
      width: 72,
      height: 72,
      borderRadius: radius.sm,
      backgroundColor: colors.background,
    },
    cardBody: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      flex: 1,
      fontWeight: '700',
      fontSize: 15,
      color: colors.secondary,
    },
    distancePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.badge,
      backgroundColor: colors.successMuted,
    },
    distanceText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    cardAddress: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    hoursDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    hoursText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardMeta: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    secondaryBtn: {
      flex: 1,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    secondaryBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondary,
    },
    primaryBtn: {
      flex: 1,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    primaryBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.onPrimary,
    },
    recenterButton: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: 20,
    },
    webPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: colors.background,
    },
    webPlaceholderText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondary,
      opacity: 0.65,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
