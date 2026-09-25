import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { formatDistanceKm, KINSHASA_CENTER } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CustomerLocker } from '../lib/api';
import { AppSpinner } from './AppSpinner';
import { useColors } from '../theme';

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
  loading?: boolean;
};

export function LockerSelectPanel({
  lockers,
  selectedLockerId,
  onSelectLocker,
  loading,
}: LockerSelectPanelProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const lockerMapStyles = useMemo(() => createLockerMapStyles(colors), [colors]);
  if (loading) {
    return <AppSpinner />;
  }

  return (
    <View style={lockerMapStyles.list}>
      {lockers.map((locker) => {
        const selected = locker.id === selectedLockerId;
        const available = locker.availableSlots ?? locker.availableCompartments;
        const hours =
          locker.type === 'SMART_LOCKER' ? t('points.hoursSmart') : t('points.hoursPartner');
        return (
          <Pressable
            key={locker.id}
            onPress={() => onSelectLocker(locker.id)}
            style={[lockerMapStyles.card, selected && lockerMapStyles.cardSelected]}
          >
            <Text style={lockerMapStyles.cardTitle}>{locker.name}</Text>
            <Text style={lockerMapStyles.cardAddress}>{locker.address}</Text>
            <View style={lockerMapStyles.hoursRow}>
              <View style={lockerMapStyles.hoursDot} />
              <Text style={lockerMapStyles.hoursText}>{hours}</Text>
            </View>
            <Text style={lockerMapStyles.cardMeta}>
              {t('points.compartmentsAvailable', { count: available })}
              {locker.distanceKm != null ? ` · ${formatDistanceKm(locker.distanceKm)}` : ''}
            </Text>
            <Pressable
              onPress={() => openDirections(locker.latitude, locker.longitude, locker.name)}
              style={lockerMapStyles.directionsRow}
              hitSlop={8}
            >
              <Text style={lockerMapStyles.directionsText}>{t('points.directions')}</Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </Pressable>
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
      borderRadius: 0,
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
      borderRadius: 0,
      padding: 14,
      backgroundColor: colors.surface,
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
    },
    cardTitle: {
      fontWeight: '700',
      fontSize: 15,
      color: colors.secondary,
    },
    cardAddress: {
      marginTop: 4,
      fontSize: 13,
      color: colors.secondary,
      opacity: 0.8,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
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
    cardMeta: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
    directionsRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 2,
    },
    directionsText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
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
      borderRadius: radius.button,
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
