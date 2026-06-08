import { colors } from '@eveider/config-ui';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>EVEIDER MOBILE</Text>
        <Text style={styles.title}>APPLICATION COLIS</Text>
        <Text style={styles.subtitle}>Monorepo initialisé — prêt pour le développement.</Text>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.secondary,
  },
  title: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  subtitle: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondary,
    textAlign: 'center',
  },
});
