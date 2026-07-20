import { colors, radius, borders } from '@eveider/config-ui';
import { formatDistanceKm, KINSHASA_CENTER } from '@eveider/domain';
import * as Location from 'expo-location';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CustomerLocker } from '../lib/api';

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
  if (loading) {
    return <ActivityIndicator color={colors.secondary} style={{ marginVertical: 24 }} />;
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
              {locker.availableCompartments} disponible{locker.availableCompartments > 1 ? 's' : ''}
              {locker.distanceKm != null ? ` · ${formatDistanceKm(locker.distanceKm)}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export async function getCurrentCoordinates() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return KINSHASA_CENTER;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function openDirections(latitude: number, longitude: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodedLabel}`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  void Linking.openURL(url);
}

export const lockerMapStyles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
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
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: colors.surface,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E8FCE8',
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
