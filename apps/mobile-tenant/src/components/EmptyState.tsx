import { type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      paddingVertical: 20,
    },
    title: {
      fontWeight: '700',
      fontSize: 16,
      color: colors.secondary,
    },
    message: {
      marginTop: 8,
      fontWeight: '400',
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
  });
}
