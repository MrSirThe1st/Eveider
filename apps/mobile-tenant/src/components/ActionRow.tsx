import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type ActionRowProps = {
  label: string;
  hint?: string;
  icon?: keyof typeof Feather.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  last?: boolean;
};

export function ActionRow({
  label,
  hint,
  icon,
  selected,
  onPress,
  trailing,
  last,
}: ActionRowProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = (
    <View style={[styles.row, selected && styles.rowSelected, last && styles.last]}>
      {icon ? <Feather name={icon} size={18} color={colors.secondary} /> : null}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {trailing ?? (
        onPress ? <Feather name="chevron-right" size={18} color={colors.primary} /> : null
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    last: {
      marginBottom: 0,
    },
    rowSelected: {
      borderColor: colors.primary,
    },
    text: {
      flex: 1,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    hint: {
      marginTop: 3,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
