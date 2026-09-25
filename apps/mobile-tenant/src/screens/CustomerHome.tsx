import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ActionRow } from '../components/ActionRow';
import { AppSpinner } from '../components/AppSpinner';
import { EmptyState } from '../components/EmptyState';
import { ParcelCard } from '../components/ParcelCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useCustomerShell } from '../navigation/customer-shell';
import {
  fetchCustomerParcels,
  fetchProfile,
  trackParcelByNumber,
  type CustomerParcel,
} from '../lib/api';
import { useColors } from '../theme';

const HOME_HERO = require('../assets/mobile-home.jpeg');

type CustomerHomeProps = {
  onTrackResult: (parcel: CustomerParcel) => void;
};

function firstNameFrom(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first || null;
}

export const CustomerHome = memo(function CustomerHome({ onTrackResult }: CustomerHomeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isGuest, requestAuth, goToReceive, goToPoints } = useCustomerShell();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [parcels, setParcels] = useState<CustomerParcel[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isGuest);
  const [refreshing, setRefreshing] = useState(false);

  const loadParcels = useCallback(async (silent = false) => {
    if (isGuest) {
      setParcels([]);
      setFirstName(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!silent) setLoading(true);
    const [parcelsResult, profileResult] = await Promise.all([
      fetchCustomerParcels(),
      fetchProfile(),
    ]);
    setLoading(false);
    setRefreshing(false);
    if (parcelsResult.success) setParcels(parcelsResult.data.parcels);
    if (profileResult.success) {
      setFirstName(firstNameFrom(profileResult.data.profile.fullName));
    }
  }, [isGuest]);

  useEffect(() => {
    void loadParcels();
  }, [loadParcels]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadParcels(true);
  }, [loadParcels]);

  async function handleTrack() {
    const value = trackingNumber.trim();
    setTrackError(null);
    if (value.length < 8) {
      setTrackError(t('track.tooShort'));
      return;
    }

    if (!isGuest) {
      const local = parcels.find(
        (item) =>
          item.trackingNumber.toLowerCase() === value.toLowerCase() ||
          (item.reference ?? '').toLowerCase() === value.toLowerCase(),
      );
      if (local) {
        goToReceive(local.id);
        return;
      }
    }

    setTracking(true);
    const result = await trackParcelByNumber(value);
    setTracking(false);
    if (!result.success || !result.data.parcel) {
      setTrackError(result.success ? t('track.notFound') : result.error);
      return;
    }

    if (!isGuest) {
      const owned = parcels.some((item) => item.id === result.data.parcel!.id);
      if (owned) {
        goToReceive(result.data.parcel.id);
        return;
      }
    }

    onTrackResult(result.data.parcel);
  }

  const recent = parcels.filter((item) => item.status !== 'collected').slice(0, 3);
  const greeting = firstName
    ? `${t('home.greeting')} ${firstName}`
    : t('home.greetingPlain');

  return (
    <View style={styles.screen}>
      <ScreenHeader mode="CLIENT" title={t('tabs.home')} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.intro}>
          <Text style={styles.hello}>{greeting}</Text>
        </View>

        <ImageBackground source={HOME_HERO} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroScrim} />
        </ImageBackground>

        <View style={styles.body}>
          <Text style={styles.trackTitle}>{t('home.trackTitle')}</Text>
          <View style={styles.trackRow}>
            <TextInput
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              placeholder={t('home.trackPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => void handleTrack()}
              style={styles.trackInput}
            />
            <Pressable
              onPress={() => void handleTrack()}
              style={styles.trackButton}
              accessibilityRole="button"
              accessibilityLabel={t('home.trackAction')}
            >
              {tracking ? (
                <AppSpinner size="sm" color={colors.onPrimary} />
              ) : (
                <Feather name="chevron-right" size={22} color={colors.onPrimary} />
              )}
            </Pressable>
          </View>
          {trackError ? <Text style={styles.trackError}>{trackError}</Text> : null}

          {isGuest ? (
            <View style={styles.getStarted}>
              <Text style={styles.getStartedLabel}>{t('home.getStarted')}</Text>
              <View style={styles.authLinks}>
                <Pressable onPress={() => requestAuth('login')} hitSlop={8}>
                  <Text style={styles.authLink}>{t('common.signIn')}</Text>
                </Pressable>
                <Text style={styles.authSep}>|</Text>
                <Pressable onPress={() => requestAuth('register')} hitSlop={8}>
                  <Text style={styles.authLink}>{t('common.signUp')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!isGuest ? <View style={styles.divider} /> : null}

          {!isGuest && loading && !refreshing && parcels.length === 0 ? <AppSpinner /> : null}

          {!isGuest && !loading && recent.length > 0 ? (
            <View style={styles.parcelsSection}>
              <Text style={styles.section}>{t('home.recentTitle')}</Text>
              {recent.map((item) => (
                <Pressable key={item.id} onPress={() => goToReceive(item.id)} style={styles.rowWrap}>
                  <ParcelCard parcel={item} />
                </Pressable>
              ))}
              <Pressable
                onPress={() => goToReceive()}
                style={styles.viewAll}
                accessibilityRole="button"
              >
                <Text style={styles.viewAllText}>{t('home.viewAllParcels')}</Text>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </Pressable>
            </View>
          ) : null}

          {!isGuest && !loading && recent.length === 0 ? (
            <EmptyState
              icon="package"
              title={t('home.emptyTitle')}
              message={t('home.emptyMessage')}
            />
          ) : null}

          <View style={styles.divider} />

          <ActionRow
            icon="map-pin"
            label={t('home.findPoint')}
            onPress={goToPoints}
            last
          />
        </View>
      </ScrollView>
    </View>
  );
});

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingBottom: 40,
    },
    intro: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    hello: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.secondary,
    },
    hero: {
      height: 200,
      marginHorizontal: 20,
      overflow: 'hidden',
    },
    heroImage: {
      resizeMode: 'cover',
    },
    heroScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    trackTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
      marginBottom: 10,
    },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    trackInput: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      color: colors.secondary,
      fontSize: 15,
      fontWeight: '600',
    },
    trackButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    trackError: {
      marginTop: 8,
      color: colors.danger,
      fontWeight: '500',
      fontSize: 13,
    },
    getStarted: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
      gap: 12,
    },
    getStartedLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.secondary,
      flex: 1,
    },
    authLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    authLink: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    authSep: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 24,
    },
    parcelsSection: {
      gap: 0,
    },
    section: {
      marginBottom: 10,
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    rowWrap: {
      marginBottom: 8,
    },
    viewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 12,
      marginTop: 4,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}
