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
        <Text style={styles.intro}>{t('placeholders.aboutIntro')}</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('placeholders.aboutVersion')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('placeholders.aboutCitiesHeading')}</Text>
        {loading ? <AppSpinner size="sm" fill={false} /> : null}
        {!loading && error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void loadCities()} />
          </View>
        ) : null}
        {!loading && !error && cities?.length === 0 ? (
          <Text style={styles.muted}>{t('placeholders.aboutCitiesEmpty')}</Text>
        ) : null}
        {!loading && !error && cities && cities.length > 0
          ? cities.map((name, index) => (
              <View
                key={name}
                style={[styles.row, index === cities.length - 1 && styles.rowLast]}
              >
                <Text style={styles.rowLabel}>{name}</Text>
              </View>
            ))
          : null}

        <Text style={styles.footer}>{t('placeholders.aboutCopyright')}</Text>
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
      lineHeight: 21,
    },
    sectionTitle: {
      marginTop: 20,
      marginBottom: 4,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    row: {
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
    muted: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 20,
    },
    feedback: {
      marginTop: 8,
      gap: 12,
    },
    error: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.danger,
      lineHeight: 20,
    },
    footer: {
      marginTop: 28,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
      opacity: 0.85,
    },
  });
}
