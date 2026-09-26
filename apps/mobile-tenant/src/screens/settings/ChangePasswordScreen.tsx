import { type ColorTokens } from '@eveider/config-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PasswordInput } from '../../components/PasswordInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { changeAccountPassword } from '../../lib/api';
import { useColors } from '../../theme';

type ChangePasswordScreenProps = {
  mode: 'CLIENT' | 'DRIVER';
  onBack: () => void;
};

export function ChangePasswordScreen({ onBack }: ChangePasswordScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError(t('personalInfoSettings.currentPasswordRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('personalInfoSettings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('personalInfoSettings.passwordMismatch'));
      return;
    }

    setSaving(true);
    const result = await changeAccountPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccess(t('personalInfoSettings.passwordChanged'));
  }

  return (
    <ScreenScaffold title={t('profile.password')} onBack={onBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>{t('personalInfoSettings.passwordIntro')}</Text>

        <PasswordInput
          label={t('personalInfoSettings.currentPassword')}
          placeholder={t('auth.passwordPlaceholder')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordInput
          label={t('personalInfoSettings.newPassword')}
          placeholder={t('auth.passwordPlaceholder')}
          value={newPassword}
          onChangeText={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordInput
          label={t('personalInfoSettings.confirmPassword')}
          placeholder={t('auth.passwordPlaceholder')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="new-password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={t('personalInfoSettings.changePassword')}
            loading={saving}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    intro: {
      marginBottom: 16,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 20,
    },
    error: {
      marginBottom: 12,
      color: colors.danger,
      fontWeight: '600',
      fontSize: 13,
      lineHeight: 18,
    },
    success: {
      marginBottom: 12,
      color: colors.secondary,
      fontWeight: '500',
      fontSize: 13,
      lineHeight: 18,
    },
    actions: {
      marginTop: 8,
    },
  });
}
