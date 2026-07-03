import { Text, View } from 'react-native';
import {
  getCurrentCoordinates,
  lockerMapStyles as styles,
  LockerSelectPanel,
  openDirections,
  type LockerMapViewProps,
} from './locker-map-shared';

/** Web fallback — react-native-maps is native-only. */
export function LockerMapView({
  lockers,
  selectedLockerId,
  height = 280,
}: LockerMapViewProps) {
  const selected = lockers.find((locker) => locker.id === selectedLockerId);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.webPlaceholder}>
        <Text style={styles.webPlaceholderText}>
          Carte non disponible sur le web.{'\n'}
          Utilisez l’émulateur ou Expo Go pour la carte interactive.
        </Text>
        {selected ? (
          <Text style={[styles.webPlaceholderText, { marginTop: 12, opacity: 1 }]}>
            Sélectionné : {selected.name}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export { LockerSelectPanel, getCurrentCoordinates, openDirections };
