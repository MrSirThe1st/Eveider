import { nativeRadius as radius, spacing, borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useAppTheme, useColors } from '../theme';

type PasswordInputProps = Pick<
  TextInputProps,
  'placeholder' | 'autoComplete' | 'value' | 'onChangeText'
> & {
  label: string;
};

export function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const colors = useColors();
  const { scheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance={scheme}
          textContentType="password"
        />
        <Pressable
          style={styles.toggle}
          onPress={() => setVisible((current) => !current)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          <Feather name={visible ? 'eye-off' : 'eye'} size={20} color={colors.primary} />
        </Pressable>
      </View>
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
    field: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      minHeight: spacing.inputHeight,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.input,
      paddingLeft: 12,
      paddingRight: 48,
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
    toggle: {
      position: 'absolute',
      right: 4,
      height: 40,
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
