import { StyleSheet, View, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { KINSHASA_CENTER } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useColors } from '../theme';
import {
  getCurrentCoordinates,
  LockerSelectPanel,
  openAddressSearch,
  openDirections,
  openMultiStopDirections,
  openStopDirections,
  useLockerMapStyles,
  type LockerMapViewProps,
} from './locker-map-shared';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export function LockerMapView({
  lockers,
  selectedLockerId,
  onSelectLocker,
  highlightLockerId,
  height = 280,
  onRequestRecenter,
  recenterToken = 0,
  focusCoordinate = null,
}: LockerMapViewProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useLockerMapStyles();
  const mapRef = useRef<MapView>(null);

  const selectedRegion = useMemo(() => {
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

  useEffect(() => {
    mapRef.current?.animateToRegion(selectedRegion, 280);
  }, [selectedRegion]);

  useEffect(() => {
    if (recenterToken === 0) return;
    void (async () => {
      const coords = await getCurrentCoordinates();
      mapRef.current?.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        320,
      );
    })();
  }, [recenterToken]);

  useEffect(() => {
    if (!focusCoordinate) return;
    mapRef.current?.animateToRegion(
      {
        latitude: focusCoordinate.latitude,
        longitude: focusCoordinate.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      320,
    );
  }, [focusCoordinate]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={GOOGLE_MAPS_KEY ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={selectedRegion}
        mapType="standard"
      >
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
      {onRequestRecenter ? (
        <Pressable
          onPress={onRequestRecenter}
          style={styles.recenterButton}
          accessibilityRole="button"
          accessibilityLabel={t('points.recenter')}
        >
          <Feather name="crosshair" size={18} color={colors.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export { LockerSelectPanel, getCurrentCoordinates, openAddressSearch, openDirections, openMultiStopDirections, openStopDirections };
