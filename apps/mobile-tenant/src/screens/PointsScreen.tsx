import { borders, type ColorTokens } from '@eveider/config-ui';
import { DRC_CITIES, type DrcCity } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenScaffold } from '../components/ScreenHeader';
import { SelectField } from '../components/SelectField';
import { LockerMapView, LockerSelectPanel } from '../components/LockerMapView';
import { fetchLockersByCity, type CustomerLocker } from '../lib/api';
import { useColors } from '../theme';

export function PointsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [city, setCity] = useState<DrcCity | ''>('');
  const [cityOpen, setCityOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lockers, setLockers] = useState<CustomerLocker[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);

  const cityOptions = useMemo(
    () => DRC_CITIES.map((value) => ({ value, label: value })),
    [],
  );

  const loadCity = useCallback(
    async (nextCity: DrcCity) => {
      setCityOpen(false);
      setLoading(true);
      setError(null);
      try {
        const result = await fetchLockersByCity(nextCity);
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
    },
    [t],
  );

  useEffect(() => {
    if (!city) {
      setLockers([]);
      setSelectedLockerId('');
      setError(null);
      return;
    }
    void loadCity(city);
  }, [city, loadCity]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return lockers;
    return lockers.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.address.toLowerCase().includes(needle),
    );
  }, [lockers, query]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedLockerId('');
      return;
    }
    if (!filtered.some((item) => item.id === selectedLockerId)) {
      setSelectedLockerId(filtered[0]!.id);
    }
  }, [filtered, selectedLockerId]);

  return (
    <ScreenScaffold title={t('tabs.points')}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <SelectField
          label={t('points.regionLabel')}
          value={city}
          options={cityOptions}
          open={cityOpen}
          onOpenChange={setCityOpen}
          onChange={(value) => setCity(value as DrcCity)}
          placeholder={t('points.regionPlaceholder')}
          searchable
          emptyLabel={t('points.noCityMatch')}
        />

        {city ? (
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('points.pointSearchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        ) : null}

        {!city ? <Text style={styles.prompt}>{t('points.prompt')}</Text> : null}

        {city && loading ? (
          <Text style={styles.prompt}>{t('common.loading')}</Text>
        ) : null}

        {city && !loading && error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void loadCity(city)} />
          </View>
        ) : null}

        {city && !loading && !error && filtered.length === 0 ? (
          <EmptyState title={t('points.emptyTitle')} message={t('points.emptyCityMessage')} />
        ) : null}

        {city && !loading && !error && filtered.length > 0 ? (
          <>
            <LockerMapView
              lockers={filtered}
              selectedLockerId={selectedLockerId}
              onSelectLocker={setSelectedLockerId}
              onRequestRecenter={() => setRecenterToken((value) => value + 1)}
              recenterToken={recenterToken}
            />
            <Text style={styles.nearby}>
              {t('points.nearby', { count: filtered.length })}
            </Text>
            <LockerSelectPanel
              lockers={filtered}
              selectedLockerId={selectedLockerId}
              onSelectLocker={setSelectedLockerId}
            />
          </>
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
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      marginBottom: 16,
      minHeight: 48,
      paddingHorizontal: 12,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.secondary,
      paddingVertical: 10,
    },
    prompt: {
      marginTop: 20,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    nearby: {
      marginTop: 16,
      marginBottom: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondary,
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
  });
}
