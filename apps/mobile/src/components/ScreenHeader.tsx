import { colors } from '@eveider/config-ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ScreenHeaderProps = {
  mode: 'CLIENT' | 'COURSIER';
  title: string;
  onBack?: () => void;
  onLogout?: () => void;
  compact?: boolean;
};

export function ScreenHeader({ mode, title, onBack, onLogout, compact }: ScreenHeaderProps) {
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactTopRow}>
          <View>
            <Text style={styles.compactBrand}>EVEIDER</Text>
            <Text style={styles.compactMode}>{mode}</Text>
          </View>
        </View>
        <Text style={styles.compactTitle}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brand}>EVEIDER</Text>
          <Text style={styles.mode}>{mode}</Text>
        </View>
        {onLogout ? (
          <Pressable onPress={onLogout} hitSlop={8}>
            <Text style={styles.logout}>DÉCONNEXION</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.titleRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <Text style={styles.back}>←</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    marginBottom: 8,
  },
  compactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  compactBrand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: colors.secondary,
  },
  compactMode: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.secondary,
    opacity: 0.7,
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  container: {
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.secondary,
  },
  mode: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.secondary,
    opacity: 0.7,
  },
  logout: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    paddingRight: 4,
  },
  back: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
});
