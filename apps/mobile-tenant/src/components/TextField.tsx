import { nativeRadius as radius, spacing, borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAppTheme, useColors } from '../theme';

type TextFieldProps = TextInputProps & {
  label: string;
  prominent?: boolean;
};

export function TextField({ label, prominent, style, ...inputProps }: TextFieldProps) {
  const colors = useColors();
  const { scheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.input, prominent && styles.inputProminent, style]}
        placeholderTextColor={colors.textMuted}
        keyboardAppearance={scheme}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
      marginBottom: 6,
    },
    input: {
      minHeight: spacing.inputHeight,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.input,
      paddingHorizontal: 12,
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
    inputProminent: {
      minHeight: 56,
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
  });
}
