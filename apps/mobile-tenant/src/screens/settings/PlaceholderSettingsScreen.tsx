import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { useColors } from '../../theme';

type PlaceholderSettingsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  title: string;
  onBack: () => void;
  intro: string;
  bullets?: string[];
  hideFooter?: boolean;
  action?: { label: string; onPress: () => void };
};

export function PlaceholderSettingsScreen({
  title,
  onBack,
  intro,
  bullets = [],
  hideFooter = false,
  action,
}: PlaceholderSettingsScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <ScreenScaffold title={title} onBack={onBack}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

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
        {action ? (
          <Pressable onPress={action.onPress} style={styles.action}>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ) : null}
        {hideFooter || action ? null : (
          <Text style={styles.footer}>Fonctionnalité à venir — placeholder MVP.</Text>
        )}
      </View>
    </ScrollView>
    </ScreenScaffold>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  card: {
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
  action: {
    marginTop: 8,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  });
}
