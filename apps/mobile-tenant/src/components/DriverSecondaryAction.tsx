import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type DriverSecondaryActionProps = {
  label: string;
  onPress: () => void;
  danger?: boolean;
  /** Quiet icon+text row for list footers; bordered for detail actions. */
  variant?: 'card' | 'quiet';
  icon?: keyof typeof Feather.glyphMap;
};

/** Secondary action — quiet work-queue row or bordered detail control. */
export function DriverSecondaryAction({
  label,
  onPress,
  danger = false,
  variant = 'card',
  icon,
}: DriverSecondaryActionProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const quiet = variant === 'quiet';
  const tone = danger ? colors.danger : quiet ? colors.textMuted : colors.secondary;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, quiet && styles.quiet]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.content}>
        {icon ? <Feather name={icon} size={quiet ? 16 : 15} color={tone} /> : null}
        <Text style={[styles.label, quiet && styles.labelQuiet, danger && styles.danger]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      marginTop: 12,
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    quiet: {
      marginTop: 18,
      borderWidth: 0,
      backgroundColor: 'transparent',
      paddingVertical: 8,
      paddingHorizontal: 2,
      alignItems: 'flex-start',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontWeight: '600',
      fontSize: 13,
      color: colors.secondary,
    },
    labelQuiet: {
      fontWeight: '500',
      fontSize: 14,
      color: colors.textMuted,
    },
    danger: {
      color: colors.danger,
    },
  });
}
