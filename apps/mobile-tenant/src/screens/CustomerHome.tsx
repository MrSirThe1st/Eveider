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
import { fetchCustomerParcels, trackParcelByNumber, type CustomerParcel } from '../lib/api';
import { callEveiderSupport } from '../lib/support';
import { useColors } from '../theme';

const HOME_HERO = require('../assets/mobile-home.jpeg');

type CustomerHomeProps = {
  onTrackResult: (parcel: CustomerParcel) => void;
};

export const CustomerHome = memo(function CustomerHome({ onTrackResult }: CustomerHomeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isGuest, requestAuth, goToReceive, goToPoints } = useCustomerShell();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [parcels, setParcels] = useState<CustomerParcel[]>([]);
  const [loading, setLoading] = useState(!isGuest);
  const [refreshing, setRefreshing] = useState(false);

  const loadParcels = useCallback(async (silent = false) => {
    if (isGuest) {
      setParcels([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!silent) setLoading(true);
    const result = await fetchCustomerParcels();
    setLoading(false);
    setRefreshing(false);
    if (result.success) setParcels(result.data.parcels);
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
  const displayName = isGuest ? t('common.guest') : t('roles.customer');

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
        <ImageBackground source={HOME_HERO} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroScrim} />
          <Text style={styles.hello}>
            {t('home.greeting')}{' '}
            <Text style={styles.helloName}>{displayName}</Text>
          </Text>
          <View style={styles.trackBox}>
            <Text style={styles.trackTitle}>{t('home.trackTitle')}</Text>
            <View style={styles.trackRow}>
              <TextInput
                value={trackingNumber}
                onChangeText={setTrackingNumber}
                placeholder={t('home.trackPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.55)"
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
          </View>
        </ImageBackground>

        <View style={styles.body}>
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

          <ActionRow
            icon="phone"
            label={t('home.callEveider')}
            onPress={callEveiderSupport}
          />
          <ActionRow
            icon="map-pin"
            label={t('home.findPoint')}
            onPress={goToPoints}
            last
          />

          {!isGuest && loading && !refreshing && parcels.length === 0 ? <AppSpinner /> : null}

          {!isGuest && !loading && recent.length > 0 ? (
            <>
              <Text style={styles.section}>{t('home.recentTitle')}</Text>
              {recent.map((item) => (
                <Pressable key={item.id} onPress={() => goToReceive(item.id)} style={styles.rowWrap}>
                  <ParcelCard parcel={item} />
                </Pressable>
              ))}
            </>
          ) : null}

          {!isGuest && !loading && recent.length === 0 ? (
            <EmptyState title={t('home.emptyTitle')} message={t('home.emptyMessage')} />
          ) : null}
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
  hero: {
    minHeight: 280,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  hello: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  helloName: {
    fontWeight: '700',
    color: colors.primary,
  },
  trackBox: {
    backgroundColor: 'rgba(18,18,18,0.72)',
    padding: 14,
    gap: 10,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: borders.width,
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#FFFFFF',
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
    color: '#FFB4B4',
    fontWeight: '500',
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  getStarted: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  section: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  rowWrap: {
    marginBottom: 8,
  },
  });
}
