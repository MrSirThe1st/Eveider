import { radius, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Image, View } from 'react-native';
import type { LockerVisual } from '../lib/parcel-journey';
import { useColors } from '../theme';

const lockerLocked = require('../assets/lockerLocked.png');
const lockerOpen = require('../assets/lockerOpen.png');

type LockerIllustrationProps = {
  visual: LockerVisual;
};

export function LockerIllustration({ visual }: LockerIllustrationProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
      backgroundColor: colors.primaryMuted,
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
}
