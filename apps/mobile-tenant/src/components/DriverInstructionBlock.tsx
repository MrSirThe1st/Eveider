import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type DriverInstructionBlockProps = {
  instructions: string | null | undefined;
  title?: string;
};

export function DriverInstructionBlock({
  instructions,
  title = 'Instructions chauffeur',
}: DriverInstructionBlockProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const value = instructions?.trim();
  if (!value) return null;

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    block: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 8,
      gap: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    body: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      color: colors.secondary,
    },
  });
}
