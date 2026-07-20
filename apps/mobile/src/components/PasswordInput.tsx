import { colors, radius, borders } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

type PasswordInputProps = Pick<TextInputProps, 'placeholder' | 'autoComplete' | 'value' | 'onChangeText'>;

export function PasswordInput({ value, onChangeText, placeholder, autoComplete }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        <Feather name={visible ? 'eye-off' : 'eye'} size={20} color={colors.secondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 48,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingLeft: 12,
    paddingRight: 44,
    backgroundColor: colors.background,
    fontWeight: '500',
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
