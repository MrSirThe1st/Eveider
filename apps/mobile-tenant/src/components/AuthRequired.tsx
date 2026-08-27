import { type ColorTokens } from '@eveider/config-ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useColors } from '../theme';

type AuthRequiredProps = {
  title: string;
  message: string;
  onSignIn: () => void;
  onSignUp: () => void;
};

export function AuthRequired({ title, message, onSignIn, onSignUp }: AuthRequiredProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.links}>
        <Pressable onPress={onSignIn} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>{t('common.signIn')}</Text>
        </Pressable>
        <Text style={styles.sep}>|</Text>
        <Pressable onPress={onSignUp} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>{t('common.signUp')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      paddingVertical: 12,
    },
    title: {
      fontWeight: '700',
      fontSize: 16,
      color: colors.secondary,
    },
    message: {
      marginTop: 8,
      marginBottom: 16,
      fontWeight: '400',
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    links: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    link: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    sep: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.primary,
    },
  });
}
