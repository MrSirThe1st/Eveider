import { nativeRadius as radius, spacing, borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';
import { AppSpinner } from './AppSpinner';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'brand';
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: PrimaryButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === 'secondary' ? colors.primary : variant === 'brand' ? colors.onPrimary : '#FFFFFF';

  return (
    <Pressable
      style={[styles.button, styles[variant], isDisabled && styles.disabled]}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <View style={styles.spinner}>
          <AppSpinner size="sm" color={spinnerColor} />
        </View>
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary'
              ? styles.secondaryLabel
              : variant === 'brand'
                ? styles.brandLabel
                : styles.solidLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      height: spacing.buttonHeight,
      borderWidth: borders.width,
      borderRadius: radius.button,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    primary: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    brand: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    disabled: {
      opacity: 0.45,
    },
    spinner: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontWeight: '600',
      fontSize: 15,
    },
    solidLabel: {
      color: colors.background,
    },
    brandLabel: {
      color: colors.onPrimary,
    },
    secondaryLabel: {
      color: colors.secondary,
    },
  });
}
