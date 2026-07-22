import { colors } from '@eveider/config-ui';
import { KINSHASA_CENTER } from '@eveider/domain';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import {
  getCurrentCoordinates,
  lockerMapStyles as styles,
  LockerSelectPanel,
  openDirections,
  type LockerMapViewProps,
} from './locker-map-shared';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

export function LockerMapView({
  lockers,
  selectedLockerId,
  onSelectLocker,
  highlightLockerId,
  height = 280,
}: LockerMapViewProps) {
  const center = useMemo(() => {
    if (lockers.length > 0) {
      const target = lockers.find((locker) => locker.id === selectedLockerId) ?? lockers[0]!;
      return {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    return {
      latitude: KINSHASA_CENTER.latitude,
      longitude: KINSHASA_CENTER.longitude,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }, [lockers, selectedLockerId]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={center}
        mapType="standard"
      >
        {MAPBOX_TOKEN ? (
          <UrlTile
            urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
            maximumZ={20}
            flipY={false}
          />
        ) : null}
        {lockers.map((locker) => {
          const isSelected = locker.id === selectedLockerId || locker.id === highlightLockerId;
          return (
            <Marker
              key={locker.id}
              coordinate={{ latitude: locker.latitude, longitude: locker.longitude }}
              pinColor={isSelected ? colors.primary : undefined}
              onPress={() => onSelectLocker?.(locker.id)}
            />
          );
        })}
      </MapView>
    </View>
  );
}

export { LockerSelectPanel, getCurrentCoordinates, openDirections };
