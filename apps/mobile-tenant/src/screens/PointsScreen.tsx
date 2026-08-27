import { borders, type ColorTokens } from '@eveider/config-ui';
import { DRC_CITIES, type DrcCity } from '@eveider/domain';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenScaffold } from '../components/ScreenHeader';
import { SelectField } from '../components/SelectField';
import { LockerMapView, LockerSelectPanel, openDirections } from '../components/LockerMapView';
import { fetchLockersByCity, type CustomerLocker } from '../lib/api';
import { useColors } from '../theme';

export function PointsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [city, setCity] = useState<DrcCity | ''>('');
  const [cityOpen, setCityOpen] = useState(false);
  const [lockers, setLockers] = useState<CustomerLocker[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cityOptions = useMemo(
    () => DRC_CITIES.map((value) => ({ value, label: value })),
    [],
  );

  const searchCity = useCallback(async () => {
    if (!city) return;
    setCityOpen(false);
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const result = await fetchLockersByCity(city);
      if (!result.success) {
        setError(result.error);
        setLockers([]);
        setSelectedLockerId('');
        return;
      }
      setLockers(result.data.lockers);
      setSelectedLockerId(result.data.lockers[0]?.id ?? '');
    } catch {
      setError(t('points.emptyMessage'));
      setLockers([]);
      setSelectedLockerId('');
    } finally {
      setLoading(false);
    }
  }, [city, t]);

  const selected = lockers.find((item) => item.id === selectedLockerId) ?? null;

  return (
    <ScreenScaffold title={t('tabs.points')}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.subtitle}>{t('points.subtitle')}</Text>

        <SelectField
          label={t('points.regionLabel')}
          value={city}
          options={cityOptions}
          open={cityOpen}
          onOpenChange={setCityOpen}
          onChange={setCity}
          placeholder={t('points.regionPlaceholder')}
          searchable
          emptyLabel={t('points.noCityMatch')}
        />
        <View style={styles.search}>
          <PrimaryButton
            label={t('points.search')}
            onPress={() => void searchCity()}
            disabled={!city}
            loading={loading}
          />
        </View>

        {!loading && error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void searchCity()} />
          </View>
        ) : null}

        {!loading && !error && !searched ? (
          <Text style={styles.prompt}>{t('points.prompt')}</Text>
        ) : null}

        {!loading && !error && searched && lockers.length === 0 ? (
          <EmptyState title={t('points.emptyTitle')} message={t('points.emptyCityMessage')} />
        ) : null}

        {!loading && lockers.length > 0 ? (
          <>
            <LockerMapView
              lockers={lockers}
              selectedLockerId={selectedLockerId}
              onSelectLocker={setSelectedLockerId}
            />
            <LockerSelectPanel
              lockers={lockers}
              selectedLockerId={selectedLockerId}
              onSelectLocker={setSelectedLockerId}
            />
          </>
        ) : null}

        {selected ? (
          <View style={styles.detail}>
            <Text style={styles.detailName}>{selected.name}</Text>
            <Text style={styles.detailMeta}>{selected.typeLabel ?? selected.type}</Text>
            <Text style={styles.detailAddress}>{selected.address}</Text>
            <Text style={styles.detailLine}>
              {selected.type === 'SMART_LOCKER' ? t('points.hoursSmart') : t('points.hoursPartner')}
            </Text>
            <Text style={styles.detailLine}>{t('points.services')}</Text>
            {selected.contactPhone ? (
              <Pressable onPress={() => void Linking.openURL(`tel:${selected.contactPhone}`)}>
                <Text style={styles.phone}>{selected.contactPhone}</Text>
              </Pressable>
            ) : null}
            <View style={styles.spacer} />
            <PrimaryButton
              label={t('customer.directions')}
              variant="brand"
              onPress={() => openDirections(selected.latitude, selected.longitude, selected.name)}
            />
          </View>
        ) : null}
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  subtitle: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  search: {
    marginBottom: 8,
  },
  prompt: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  feedback: {
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  error: {
    color: colors.danger,
    fontWeight: '500',
  },
  detail: {
    marginTop: 16,
    borderWidth: borders.width,
    borderColor: colors.border,
    padding: 16,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  detailMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  detailAddress: {
    marginTop: 8,
    fontSize: 14,
    color: colors.secondary,
  },
  detailLine: {
    marginTop: 8,
    fontSize: 13,
    color: colors.secondary,
  },
  phone: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  spacer: {
    height: 16,
  },
  });
}
