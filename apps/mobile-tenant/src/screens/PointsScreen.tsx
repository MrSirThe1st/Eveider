import { borders, radius, type ColorTokens } from '@eveider/config-ui';
import { DRC_CITIES, haversineDistanceKm, type DrcCity } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AddressPlacesField } from '../components/AddressPlacesField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenScaffold } from '../components/ScreenHeader';
import {
  LockerMapView,
  LockerSelectPanel,
  openAddressSearch,
  openDirections,
} from '../components/LockerMapView';
import { fetchLockersByCity, type CustomerLocker, type MapPlaceResult } from '../lib/api';
import { useColors } from '../theme';

const LOCKER_EMPTY = require('../assets/locker2.png');

type SortMode = 'nearest' | 'all';
type ViewMode = 'map' | 'list';

const DEFAULT_CITY: DrcCity = 'Kolwezi';

export function PointsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [city, setCity] = useState<DrcCity | ''>(DEFAULT_CITY);
  const [cityOpen, setCityOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOrigin, setSearchOrigin] = useState<{
    latitude: number;
    longitude: number;
    key: number;
  } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('nearest');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [lockers, setLockers] = useState<CustomerLocker[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);

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
    let items = lockers.map((item) => {
      if (!searchOrigin) return item;
      return {
        ...item,
        distanceKm: haversineDistanceKm(searchOrigin, {
          latitude: item.latitude,
          longitude: item.longitude,
        }),
      };
    });

    if (sortMode === 'nearest') {
      return [...items].sort((a, b) => {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
    }
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [lockers, query, sortMode, searchOrigin]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedLockerId('');
      return;
    }
    if (!filtered.some((item) => item.id === selectedLockerId)) {
      setSelectedLockerId(filtered[0]!.id);
    }
  }, [filtered, selectedLockerId]);

  function onSelectPlace(place: MapPlaceResult) {
    setQuery(place.label);
    setSearchOrigin({
      latitude: place.latitude,
      longitude: place.longitude,
      key: Date.now(),
    });
    setSortMode('nearest');
    setViewMode('map');
  }

  function clearSearchOrigin() {
    setQuery('');
    setSearchOrigin(null);
  }

  return (
    <ScreenScaffold title={t('tabs.points')}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Pressable
          onPress={() => setCityOpen((open) => !open)}
          style={styles.cityButton}
          accessibilityRole="button"
        >
          <Feather name="map-pin" size={16} color={colors.primary} />
          <Text style={styles.cityValue} numberOfLines={1}>
            {city || t('points.regionPlaceholder')}
          </Text>
          <Feather
            name={cityOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        {cityOpen ? (
          <View style={styles.cityMenu}>
            <ScrollView style={styles.cityMenuScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {DRC_CITIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setCity(item);
                    setCityOpen(false);
                  }}
                  style={[styles.cityOption, item === city && styles.cityOptionSelected]}
                >
                  <Text
                    style={[
                      styles.cityOptionText,
                      item === city && styles.cityOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.searchWrap}>
          <AddressPlacesField
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (!value.trim()) setSearchOrigin(null);
            }}
            onSelectPlace={onSelectPlace}
            placeholder={t('maps.addressPlaceholder')}
          />
          {searchOrigin ? (
            <Pressable onPress={clearSearchOrigin} style={styles.clearSearch} hitSlop={8}>
              <Text style={styles.clearSearchText}>{t('maps.clearSearch')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.toolbar}>
          <View style={styles.sortTabs}>
            <Pressable onPress={() => setSortMode('nearest')} style={styles.sortTab}>
              <Text
                style={[
                  styles.sortLabel,
                  sortMode === 'nearest' && styles.sortLabelActive,
                ]}
              >
                {t('points.sortNearest')}
              </Text>
            </Pressable>
            <Pressable onPress={() => setSortMode('all')} style={styles.sortTab}>
              <Text
                style={[styles.sortLabel, sortMode === 'all' && styles.sortLabelActive]}
              >
                {t('points.sortAll')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('map')}
              style={[styles.viewBtn, viewMode === 'map' && styles.viewBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={t('points.viewMap')}
            >
              <Feather
                name="map"
                size={14}
                color={viewMode === 'map' ? colors.onPrimary : colors.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={t('points.viewList')}
            >
              <Feather
                name="list"
                size={14}
                color={viewMode === 'list' ? colors.onPrimary : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {!city ? <Text style={styles.prompt}>{t('points.prompt')}</Text> : null}

        {city && loading ? <Text style={styles.prompt}>{t('common.loading')}</Text> : null}

        {city && !loading && error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void loadCity(city)} />
          </View>
        ) : null}

        {city && !loading && !error && filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Image source={LOCKER_EMPTY} style={styles.emptyImage} resizeMode="contain" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchOrigin ? t('points.emptySearchTitle') : t('points.emptyTitle')}
            </Text>
            <Text style={styles.emptyMessage}>
              {searchOrigin
                ? t('points.emptySearchMessage')
                : t('points.emptyCityMessage')}
            </Text>
            {searchOrigin ? (
              <Pressable onPress={clearSearchOrigin} style={styles.emptyAction} hitSlop={8}>
                <Text style={styles.emptyActionText}>{t('maps.clearSearch')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {city && !loading && !error && filtered.length > 0 ? (
          <>
            {viewMode === 'map' ? (
              <LockerMapView
                lockers={filtered}
                selectedLockerId={selectedLockerId}
                onSelectLocker={setSelectedLockerId}
                onRequestRecenter={() => setRecenterToken((value) => value + 1)}
                recenterToken={recenterToken}
                focusCoordinate={searchOrigin}
                height={220}
              />
            ) : null}

            <LockerSelectPanel
              lockers={filtered}
              selectedLockerId={selectedLockerId}
              onSelectLocker={setSelectedLockerId}
              onViewDetails={(locker) => {
                if (locker.latitude != null && locker.longitude != null) {
                  openDirections(locker.latitude, locker.longitude, locker.name);
                  return;
                }
                openAddressSearch(`${locker.name} ${locker.address}`);
              }}
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
      paddingTop: 8,
      paddingBottom: 40,
      gap: 12,
    },
    cityButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
    },
    cityValue: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    cityMenu: {
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      maxHeight: 220,
      overflow: 'hidden',
    },
    cityMenuScroll: {
      maxHeight: 220,
    },
    cityOption: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    cityOptionSelected: {
      backgroundColor: colors.successMuted,
    },
    cityOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.secondary,
    },
    cityOptionTextSelected: {
      fontWeight: '700',
      color: colors.primary,
    },
    searchWrap: {
      zIndex: 5,
      gap: 6,
    },
    clearSearch: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
    },
    clearSearchText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 14,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.secondary,
      paddingVertical: 10,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sortTabs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    sortTab: {
      paddingVertical: 4,
    },
    sortLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
    sortLabelActive: {
      fontWeight: '700',
      color: colors.primary,
    },
    viewToggle: {
      flexDirection: 'row',
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    viewBtn: {
      width: 40,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    viewBtnActive: {
      backgroundColor: colors.primary,
    },
    prompt: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 36,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    emptyIconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: colors.successMuted,
      overflow: 'hidden',
    },
    emptyImage: {
      width: 100,
      height: 100,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.secondary,
      textAlign: 'center',
    },
    emptyMessage: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
    emptyAction: {
      marginTop: 16,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    emptyActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    feedback: {
      gap: 12,
      marginTop: 8,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
    },
  });
}
