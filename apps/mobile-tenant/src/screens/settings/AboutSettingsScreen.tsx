import { type ColorTokens } from '@eveider/config-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSpinner } from '../../components/AppSpinner';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { fetchActiveCities } from '../../lib/api';
import { useColors } from '../../theme';

type AboutSettingsScreenProps = {
  onBack: () => void;
};

export function AboutSettingsScreen({ onBack }: AboutSettingsScreenProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cities, setCities] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCities = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchActiveCities();
    if (!result.success) {
      setCities(null);
      setError(result.error);
      setLoading(false);
      return;
    }
    setCities(result.data.cities.map((city) => city.name));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  return (
    <ScreenScaffold title={t('profile.about')} onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.intro}>{t('placeholders.aboutIntro')}</Text>
          <Text style={styles.bullet}>• {t('placeholders.aboutVersion')}</Text>

          <Text style={styles.heading}>{t('placeholders.aboutCitiesHeading')}</Text>
          {loading ? <AppSpinner size="sm" fill={false} /> : null}
          {!loading && error ? (
            <View style={styles.feedback}>
              <Text style={styles.error}>{error}</Text>
              <PrimaryButton label={t('common.retry')} onPress={() => void loadCities()} />
            </View>
          ) : null}
          {!loading && !error && cities?.length === 0 ? (
            <Text style={styles.bullet}>{t('placeholders.aboutCitiesEmpty')}</Text>
          ) : null}
          {!loading && !error && cities && cities.length > 0
            ? cities.map((name) => (
                <Text key={name} style={styles.bullet}>
                  • {name}
                </Text>
              ))
            : null}

          <Text style={styles.bullet}>• {t('placeholders.aboutCopyright')}</Text>
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
      padding: 20,
      paddingTop: 0,
      paddingBottom: 40,
    },
    card: {
      gap: 12,
    },
    intro: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.secondary,
      lineHeight: 22,
    },
    heading: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondary,
      lineHeight: 20,
    },
    bullet: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondary,
      opacity: 0.85,
      lineHeight: 20,
    },
    feedback: {
      gap: 12,
    },
    error: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.danger,
      lineHeight: 20,
    },
  });
}
