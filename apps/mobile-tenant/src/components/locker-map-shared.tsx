import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { formatDistanceKm, KINSHASA_CENTER } from '@eveider/domain';
import * as Location from 'expo-location';
import { useMemo } from 'react';
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
  const colors = useColors();
  const lockerMapStyles = useMemo(() => createLockerMapStyles(colors), [colors]);
  if (loading) {
    return <AppSpinner />;
  }

  return (
    <View style={lockerMapStyles.list}>
      {lockers.map((locker) => {
        const selected = locker.id === selectedLockerId;
        return (
          <Pressable
            key={locker.id}
            onPress={() => onSelectLocker(locker.id)}
            style={[lockerMapStyles.card, selected && lockerMapStyles.cardSelected]}
          >
            <Text style={lockerMapStyles.cardTitle}>{locker.name}</Text>
            <Text style={lockerMapStyles.cardAddress}>{locker.address}</Text>
            <Text style={lockerMapStyles.cardMeta}>
              {locker.typeLabel ? `${locker.typeLabel} · ` : ''}
              {locker.availableSlots ?? locker.availableCompartments} place
              {(locker.availableSlots ?? locker.availableCompartments) > 1 ? 's' : ''} libre
              {(locker.availableSlots ?? locker.availableCompartments) > 1 ? 's' : ''}
              {locker.distanceKm != null ? ` · ${formatDistanceKm(locker.distanceKm)}` : ''}
            </Text>
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
    marginTop: 12,
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
    color: colors.secondary,
  },
  cardAddress: {
    marginTop: 4,
    color: colors.secondary,
    opacity: 0.8,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
