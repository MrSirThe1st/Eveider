import { type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type EmptyStateProps = {
  title: string;
  message: string;
  icon?: keyof typeof Feather.glyphMap;
};

export function EmptyState({ title, message, icon }: EmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Feather name={icon} size={28} color={colors.textMuted} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      paddingVertical: 12,
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
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
      lineHeight: 21,
      color: colors.textMuted,
    },
  });
}
