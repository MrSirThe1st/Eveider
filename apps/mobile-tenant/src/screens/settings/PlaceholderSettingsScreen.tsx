import { type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { useColors } from '../../theme';

type PlaceholderSettingsScreenProps = {
  mode: 'CLIENT' | 'DRIVER';
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
        <Text style={styles.intro}>{intro}</Text>
        {bullets.length > 0 ? (
          <View style={styles.list}>
            {bullets.map((item) => (
              <Text key={item} style={styles.bullet}>
                {item}
              </Text>
            ))}
          </View>
        ) : null}
        {action ? (
          <Pressable onPress={action.onPress} style={styles.action} accessibilityRole="button">
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ) : null}
        {hideFooter || action ? null : (
          <Text style={styles.footer}>Fonctionnalité à venir — placeholder MVP.</Text>
        )}
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
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    intro: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 21,
      marginBottom: 16,
    },
    list: {
      gap: 12,
    },
    bullet: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.secondary,
      lineHeight: 22,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    footer: {
      marginTop: 24,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
      opacity: 0.85,
    },
    action: {
      marginTop: 8,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    actionText: {
      fontWeight: '600',
      fontSize: 16,
      color: colors.primary,
    },
  });
}
