import { borders, radius, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppSpinner } from '../components/AppSpinner';
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

const LOCKER_HERO = require('../assets/lockerhero.png');
const BOX_EMPTY = require('../assets/boxIllustration.png');

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
  const { isGuest, requestAuth, goToReceive, goToPoints, openSettings } = useCustomerShell();
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
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.hello}>
              {firstName ? (
                <>
                  {t('home.greeting')}{' '}
                  <Text style={styles.helloName}>{firstName}</Text>
                </>
              ) : (
                t('home.greetingPlain')
              )}
            </Text>
            <Text style={styles.heroSubtitle}>{t('home.heroSubtitle')}</Text>
          </View>
          <View style={styles.heroArt}>
            <Image source={LOCKER_HERO} style={styles.heroImage} resizeMode="cover" />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.trackRow}>
            <Feather name="search" size={18} color={colors.textMuted} />
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
                <Feather name="arrow-right" size={20} color={colors.onPrimary} />
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

          <View style={styles.actions}>
            <Pressable
              onPress={goToPoints}
              style={styles.actionCard}
              accessibilityRole="button"
            >
              <Feather name="map-pin" size={20} color={colors.primary} />
              <Text style={styles.actionTitle}>{t('home.findPoint')}</Text>
              <Text style={styles.actionHint}>{t('home.findPointHint')}</Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.textMuted}
                style={styles.actionChevron}
              />
            </Pressable>
            <Pressable
              onPress={() => openSettings('Help')}
              style={styles.actionCard}
              accessibilityRole="button"
            >
              <Feather name="phone" size={20} color={colors.primary} />
              <Text style={styles.actionTitle}>{t('home.contactEveider')}</Text>
              <Text style={styles.actionHint}>{t('home.contactEveiderHint')}</Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.textMuted}
                style={styles.actionChevron}
              />
            </Pressable>
          </View>

          {!isGuest ? (
            <View style={styles.parcelsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.section}>{t('home.recentTitle')}</Text>
                <Pressable
                  onPress={() => goToReceive()}
                  style={styles.viewAll}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewAllText}>{t('home.viewAllShort')}</Text>
                  <Feather name="chevron-right" size={14} color={colors.primary} />
                </Pressable>
              </View>

              {loading && !refreshing && parcels.length === 0 ? <AppSpinner /> : null}

              {!loading && recent.length > 0
                ? recent.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => goToReceive(item.id)}
                      style={styles.rowWrap}
                    >
                      <ParcelCard parcel={item} />
                    </Pressable>
                  ))
                : null}

              {!loading && recent.length === 0 ? (
                <View style={styles.empty}>
                  <Image source={BOX_EMPTY} style={styles.emptyImage} resizeMode="contain" />
                  <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
                  <Text style={styles.emptyMessage}>{t('home.emptyMessage')}</Text>
                </View>
              ) : null}
            </View>
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
      height: 190,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 20,
      overflow: 'hidden',
    },
    heroCopy: {
      flex: 1,
      paddingRight: 4,
      zIndex: 1,
      gap: 6,
    },
    hello: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.secondary,
      lineHeight: 32,
    },
    helloName: {
      color: colors.primary,
    },
    heroSubtitle: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 20,
      maxWidth: 150,
    },
    heroArt: {
      width: 200,
      height: 190,
      overflow: 'hidden',
    },
    heroImage: {
      width: 280,
      height: 190,
      marginLeft: -40,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 52,
      paddingLeft: 14,
      paddingRight: 6,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    trackInput: {
      flex: 1,
      minHeight: 44,
      color: colors.secondary,
      fontSize: 15,
      fontWeight: '500',
      paddingVertical: 8,
    },
    trackButton: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
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
      marginTop: 16,
      gap: 12,
    },
    getStartedLabel: {
      fontSize: 15,
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
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    actionCard: {
      flex: 1,
      minHeight: 112,
      padding: 14,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      gap: 4,
    },
    actionTitle: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '700',
      color: colors.secondary,
      lineHeight: 18,
    },
    actionHint: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 16,
      paddingRight: 12,
    },
    actionChevron: {
      position: 'absolute',
      right: 10,
      bottom: 12,
    },
    parcelsSection: {
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    section: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
    },
    viewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewAllText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    rowWrap: {
      marginBottom: 8,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 16,
      paddingHorizontal: 12,
    },
    emptyImage: {
      width: 140,
      height: 110,
      marginBottom: 12,
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
  });
}
