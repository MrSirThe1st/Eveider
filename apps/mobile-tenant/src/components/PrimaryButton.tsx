import { colors, radius, spacing, borders, nativeShadow } from '@eveider/config-ui';
import { Pressable, StyleSheet, Text } from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={[
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        isDisabled && styles.disabled,
      ]}
      disabled={isDisabled}
      onPress={onPress}
    >
      <Text style={[styles.label, !isPrimary && styles.secondaryLabel]}>
        {loading ? 'CHARGEMENT…' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: spacing.buttonHeight,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...nativeShadow.hard,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  secondaryLabel: {
    color: colors.secondary,
  },
});
