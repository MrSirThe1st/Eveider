import { type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

const BOX_EMPTY = require('../assets/boxIllustration.png');

type DriverEmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

/** Illustrated empty state matching destinataire Livraisons / Mes colis empties. */
export function DriverEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: DriverEmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Image source={BOX_EMPTY} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Feather name="arrow-right" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 16,
      paddingHorizontal: 12,
    },
    compact: {
      paddingTop: 20,
    },
    image: {
      width: 140,
      height: 110,
      marginBottom: 16,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
      textAlign: 'center',
    },
    message: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    action: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}
