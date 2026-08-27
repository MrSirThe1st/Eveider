import { spacing, type ColorTokens } from '@eveider/config-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGUAGE_LABELS, useSettings, type AppLanguage } from '../context/settings-context';
import i18n, { deviceLanguage } from '../i18n';
import { APP_COUNTRIES, DEFAULT_COUNTRY, type AppCountry } from '../lib/countries';
import { PrimaryButton } from '../components/PrimaryButton';
import { SelectField } from '../components/SelectField';
import { useColors } from '../theme';

const logo = require('../assets/eveider_logo.png');

const LANGUAGES: AppLanguage[] = ['fr', 'en'];

export function LocaleSetupScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { completeSetup } = useSettings();
  const [language, setLanguage] = useState<AppLanguage>(deviceLanguage);
  const [country, setCountry] = useState<AppCountry>(DEFAULT_COUNTRY);
  const [openField, setOpenField] = useState<'language' | 'country' | null>(null);

  const languageOptions = LANGUAGES.map((code) => ({
    value: code,
    label: LANGUAGE_LABELS[code],
  }));

  const countryOptions = APP_COUNTRIES.map((item) => ({
    value: item.code,
    label: t(`countries.${item.code}`),
  }));

  function handleLanguage(next: AppLanguage) {
    setLanguage(next);
    void i18n.changeLanguage(next);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 32), paddingBottom: Math.max(insets.bottom, 32) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={logo}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel={t('splash.accessibilityLabel')}
      />
      <Text style={styles.title}>{t('setup.title')}</Text>
      <Text style={styles.subtitle}>{t('setup.subtitle')}</Text>

      <SelectField
        label={t('setup.languageLabel')}
        value={language}
        options={languageOptions}
        open={openField === 'language'}
        onOpenChange={(open) => setOpenField(open ? 'language' : null)}
        onChange={handleLanguage}
      />

      <SelectField
        label={t('setup.countryLabel')}
        value={country}
        options={countryOptions}
        open={openField === 'country'}
        onOpenChange={(open) => setOpenField(open ? 'country' : null)}
        onChange={setCountry}
      />

      <View style={styles.footer}>
        <PrimaryButton
          label={t('setup.continue')}
          onPress={() => completeSetup({ language, country })}
        />
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  logo: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 28,
  },
  });
}
