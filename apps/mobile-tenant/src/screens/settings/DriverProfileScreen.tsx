import { radius, type ColorTokens } from '@eveider/config-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSpinner } from '../../components/AppSpinner';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenScaffold } from '../../components/ScreenHeader';
import {
  fetchCourierDriverProfile,
  type CourierDriverDocumentStatus,
  type CourierDriverProfile,
} from '../../lib/api';
import { useColors } from '../../theme';

type DriverProfileScreenProps = {
  onBack: () => void;
};

function documentStatusLabel(
  status: CourierDriverDocumentStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  switch (status) {
    case 'verified':
      return t('driverProfile.docVerified');
    case 'pending':
      return t('driverProfile.docPending');
    case 'needs_correction':
      return t('driverProfile.docNeedsCorrection');
    default:
      return t('driverProfile.docMissing');
  }
}

export function DriverProfileScreen({ onBack }: DriverProfileScreenProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<CourierDriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCourierDriverProfile();
    if (!silent) setLoading(false);
    setRefreshing(false);
    if (!result.success) {
      setError(result.error);
      setProfile(null);
      return;
    }
    setProfile(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !profile) {
    return (
      <ScreenScaffold title={t('driverProfile.title')} onBack={onBack}>
        <AppSpinner />
      </ScreenScaffold>
    );
  }

  const name = profile?.fullName?.trim() || t('profile.account');
  const organizationName =
    profile?.organization?.name ||
    (profile?.contractorType === 'eveider' ? 'Eveider' : t('driverProfile.organizationUnknown'));

  return (
    <ScreenScaffold title={t('driverProfile.title')} onBack={onBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={colors.secondary}
          />
        }
      >
        {error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void load()} />
          </View>
        ) : null}

        {profile ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.badge}>{profile.accountStatusLabel}</Text>
            </View>

            <InfoBlock
              label={t('driverProfile.phone')}
              value={profile.phone || t('driverProfile.notProvided')}
              styles={styles}
            />
            <InfoBlock
              label={t('driverProfile.organization')}
              value={organizationName}
              styles={styles}
            />
            <InfoBlock
              label={t('driverProfile.driverId')}
              value={profile.driverCode}
              styles={styles}
            />
            <InfoBlock
              label={t('driverProfile.accountStatus')}
              value={profile.accountStatusLabel}
              styles={styles}
            />

            {profile.documents.length > 0 ? (
              <View style={styles.docs}>
                <Text style={styles.sectionTitle}>{t('driverProfile.documents')}</Text>
                {profile.documents.map((doc) => (
                  <View key={doc.key} style={styles.docRow}>
                    <Text style={styles.docLabel}>
                      {doc.key === 'identity'
                        ? t('driverProfile.docIdentity')
                        : doc.key}
                    </Text>
                    <Text
                      style={[
                        styles.docStatus,
                        doc.status === 'verified' && styles.docVerified,
                        doc.status === 'needs_correction' && styles.docWarn,
                        (doc.status === 'missing' || doc.status === 'pending') && styles.docMuted,
                      ]}
                    >
                      {documentStatusLabel(doc.status, t)}
                    </Text>
                  </View>
                ))}
                <Text style={styles.docHint}>{t('driverProfile.documentsHint')}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ScreenScaffold>
  );
}

function InfoBlock({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
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
    feedback: {
      gap: 12,
      marginBottom: 16,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
    },
    hero: {
      marginBottom: 20,
      paddingVertical: 8,
    },
    name: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.secondary,
    },
    badge: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    block: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 4,
    },
    value: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.secondary,
    },
    docs: {
      marginTop: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 10,
    },
    docRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    docLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.secondary,
    },
    docStatus: {
      fontSize: 13,
      fontWeight: '600',
    },
    docVerified: {
      color: colors.primary,
    },
    docWarn: {
      color: colors.danger,
    },
    docMuted: {
      color: colors.textMuted,
    },
    docHint: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
