import { radius, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type HeroCardProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function HeroCard({ title, subtitle, actionLabel, onAction }: HeroCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: radius.card,
      padding: 20,
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.secondary,
    },
    subtitle: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondary,
    },
    action: {
      marginTop: 16,
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: radius.button,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    actionText: {
      fontWeight: '600',
      fontSize: 12,
      letterSpacing: 0.5,
      color: colors.onPrimary,
    },
  });
}
