import { nativeColors as colors, radius, borders } from '@eveider/config-ui';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';

type PlaceholderSettingsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  title: string;
  onBack: () => void;
  intro: string;
  bullets?: string[];
};

export function PlaceholderSettingsScreen({
  mode,
  title,
  onBack,
  intro,
  bullets = [],
}: PlaceholderSettingsScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader mode={mode} title={title} onBack={onBack} />

      <View style={styles.card}>
        <Text style={styles.intro}>{intro}</Text>
        {bullets.length > 0 ? (
          <View style={styles.list}>
            {bullets.map((item) => (
              <Text key={item} style={styles.bullet}>
                • {item}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.footer}>Fonctionnalité à venir — placeholder MVP.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 20,
    gap: 12,
  },
  intro: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondary,
    lineHeight: 22,
  },
  list: {
    gap: 8,
  },
  bullet: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
    opacity: 0.85,
    lineHeight: 20,
  },
  footer: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
    opacity: 0.5,
  },
});
