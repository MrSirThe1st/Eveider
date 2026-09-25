import { DRC_PHONE_PREFIX, toE164Phone, toNationalPhoneDigits } from '@eveider/domain';
import { nativeRadius as radius, spacing, borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme, useColors } from '../theme';

type PhoneFieldProps = {
  label: string;
  value: string;
  onChangeText: (e164: string) => void;
  hint?: string;
  editable?: boolean;
};

/** Phone input with a fixed `+243` prefix. Value is always `+243…` or `''`. */
export function PhoneField({ label, value, onChangeText, hint, editable = true }: PhoneFieldProps) {
  const colors = useColors();
  const { scheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const national = toNationalPhoneDigits(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, !editable && styles.rowDisabled]}>
        <Text style={styles.prefix} accessibilityElementsHidden>
          {DRC_PHONE_PREFIX}
        </Text>
        <TextInput
          style={styles.input}
          value={national}
          onChangeText={(text) => onChangeText(toE164Phone(text))}
          placeholder="810000000"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          editable={editable}
          keyboardAppearance={scheme}
          accessibilityLabel={`${label}, indicatif ${DRC_PHONE_PREFIX}`}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: spacing.inputHeight,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.input,
      overflow: 'hidden',
    },
    rowDisabled: {
      opacity: 0.6,
    },
    prefix: {
      paddingHorizontal: 12,
      textAlignVertical: 'center',
      includeFontPadding: false,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textMuted,
      backgroundColor: colors.background,
      borderRightWidth: borders.width,
      borderRightColor: colors.border,
      lineHeight: spacing.inputHeight - 2,
    },
    input: {
      flex: 1,
      paddingHorizontal: 12,
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
    hint: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
}
