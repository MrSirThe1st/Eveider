import { colors, radius } from '@eveider/config-ui';
import { StyleSheet, Image, View } from 'react-native';
import type { LockerVisual } from '../lib/parcel-journey';

const lockerLocked = require('../assets/lockerLocked.png');
const lockerOpen = require('../assets/lockerOpen.png');

type LockerIllustrationProps = {
  visual: LockerVisual;
};

export function LockerIllustration({ visual }: LockerIllustrationProps) {
  const showOpen = visual === 'ready';
  const source = showOpen ? lockerOpen : lockerLocked;

  return (
    <View style={styles.container}>
      <View style={[styles.glow, visual === 'ready' && styles.glowReady]} />
      <Image
        source={source}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel={
          visual === 'ready'
            ? 'Casier ouvert avec colis'
            : visual === 'empty'
              ? 'Casier vide'
              : 'Casier en attente de colis'
        }
      />
      {visual === 'incoming' ? <View style={styles.incomingBadge} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    maxWidth: 300,
  },
  glow: {
    position: 'absolute',
    width: '72%',
    height: 180,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  glowReady: {
    backgroundColor: 'rgba(9, 212, 11, 0.12)',
  },
  image: {
    width: '100%',
    height: 180,
  },
  incomingBadge: {
    position: 'absolute',
    top: 24,
    right: '18%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
