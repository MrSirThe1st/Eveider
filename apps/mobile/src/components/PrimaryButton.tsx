import { colors, radius, spacing } from '@eveider/config-ui';
import { Pressable, StyleSheet, Text } from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, disabled, loading }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.disabled]}
      disabled={isDisabled}
      onPress={onPress}
    >
      <Text style={styles.label}>{loading ? 'CHARGEMENT…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
});
