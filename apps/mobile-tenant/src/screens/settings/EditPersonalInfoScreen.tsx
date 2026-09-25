import { type ColorTokens } from '@eveider/config-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSpinner } from '../../components/AppSpinner';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { fetchProfile, updateAccountProfile } from '../../lib/api';
import { useColors } from '../../theme';

type EditPersonalInfoScreenProps = {
  mode: 'CLIENT' | 'DRIVER';
  onBack: () => void;
};

export function EditPersonalInfoScreen({ onBack }: EditPersonalInfoScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchProfile();
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setFullName(result.data.profile.fullName ?? '');
    setPhone(result.data.phone ?? '');
    setEmail(result.data.email ?? result.data.profile.email ?? '');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (fullName.trim().length < 2) {
      setError(t('personalInfoSettings.nameRequired'));
      return;
    }
    if (!phone.trim()) {
      setError(t('personalInfoSettings.phoneRequired'));
      return;
    }

    setSaving(true);
    const result = await updateAccountProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setFullName(result.data.fullName ?? fullName.trim());
    setPhone(result.data.phone ?? phone.trim());
    setSuccess(t('personalInfoSettings.saved'));
  }

  return (
    <ScreenScaffold title={t('profile.editProfile')} onBack={onBack}>
      {loading ? (
        <AppSpinner />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label={t('personalInfoSettings.fullName')}
            placeholder={t('auth.fullNamePlaceholder')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
          <TextField
            label={t('personalInfoSettings.phone')}
            placeholder="+243800000000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <TextField
            label={t('personalInfoSettings.email')}
            value={email}
            editable={false}
            onChangeText={() => {}}
          />
          <Text style={styles.hint}>{t('personalInfoSettings.emailReadOnly')}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              label={t('personalInfoSettings.save')}
              loading={saving}
              onPress={() => void handleSave()}
            />
          </View>
        </ScrollView>
      )}
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
      paddingBottom: 40,
    },
    hint: {
      marginTop: -8,
      marginBottom: 12,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
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
