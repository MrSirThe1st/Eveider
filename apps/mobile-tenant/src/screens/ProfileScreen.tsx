import { type ColorTokens } from '@eveider/config-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppSpinner } from '../components/AppSpinner';
import { ProfileMenuItem, ProfileSection } from '../components/ProfileMenuItem';
import { ScreenHeader } from '../components/ScreenHeader';
import { LANGUAGE_LABELS, useSettings } from '../context/settings-context';
import {
  deleteCustomerAccount,
  deactivateCourierAccount,
  fetchCustomerNotifications,
  fetchCourierDriverProfile,
  fetchCourierNotifications,
  fetchProfile,
  type CourierDriverProfile,
  type UserProfile,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { useColors } from '../theme';

type ProfileScreenProps = {
  mode: 'CLIENT' | 'DRIVER';
  isGuest?: boolean;
  onRequestAuth?: () => void;
  onOpenNotifications?: () => void;
  onOpenPersonalInfo: () => void;
  onOpenDriverProfile?: () => void;
  onContactDispatch?: () => void;
  onOpenLanguage: () => void;
  onOpenAppearance: () => void;
  onOpenHelp: () => void;
  onOpenHowItWorks?: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenAbout: () => void;
  hideHeader?: boolean;
};

export function ProfileScreen({
  mode,
  isGuest = false,
  onRequestAuth,
  onOpenNotifications,
  onOpenPersonalInfo,
  onOpenDriverProfile,
  onContactDispatch,
  onOpenLanguage,
  onOpenAppearance,
  onOpenHelp,
  onOpenHowItWorks,
  onOpenTerms,
  onOpenPrivacy,
  onOpenAbout,
  hideHeader = false,
}: ProfileScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const { language, theme } = useSettings();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<CourierDriverProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomer = mode === 'CLIENT';
  const isDriver = mode === 'DRIVER';

  const loadProfile = useCallback(async (silent = false) => {
    if (isGuest) {
      setProfile(null);
      setDriverProfile(null);
      setUnreadCount(0);
      setError(null);
      if (!silent) setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchProfile();
    if (!silent) setLoading(false);
    setRefreshing(false);

    if (!result.success) {
      setError(result.error);
      setProfile(null);
      setDriverProfile(null);
      return;
    }

    setProfile(result.data);

    if (isCustomer || isDriver) {
      const notifications = isCustomer
        ? await fetchCustomerNotifications()
        : await fetchCourierNotifications();
      if (notifications.success) {
        setUnreadCount(notifications.data.unreadCount);
      }
    }

    if (isDriver) {
      const driver = await fetchCourierDriverProfile();
      if (driver.success) {
        setDriverProfile(driver.data);
      } else {
        setDriverProfile(null);
      }
    } else {
      setDriverProfile(null);
    }
  }, [isCustomer, isDriver, isGuest]);

  function confirmCloseAccount() {
    const isCourier = mode === 'DRIVER';
    Alert.alert(
      isCourier ? t('profile.deactivateAccount') : t('profile.deleteAccount'),
      isCourier ? t('profile.deactivateAccountConfirm') : t('profile.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isCourier ? t('profile.deactivateAccount') : t('profile.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = isCourier
                ? await deactivateCourierAccount()
                : await deleteCustomerAccount();
              if (!result.success) {
                Alert.alert(t('common.error'), result.error);
                return;
              }
              await supabase.auth.signOut();
            })();
          },
        },
      ],
    );
  }

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const registeredName =
    (isDriver ? driverProfile?.fullName?.trim() : null) ||
    profile?.profile.fullName?.trim() ||
    null;
  const displayName = isGuest
    ? t('profile.guestName')
    : (registeredName || t('profile.account'));
  const contactLine = isGuest
    ? null
    : (driverProfile?.phone ??
        profile?.phone ??
        profile?.email ??
        profile?.profile.email ??
        null);
  const avatarLetter = (
    registeredName ||
    contactLine ||
    displayName
  )
    .charAt(0)
    .toUpperCase();
  const organizationName =
    driverProfile?.organization?.name ||
    (driverProfile?.contractorType === 'eveider' ? 'Eveider' : null);

  if (loading && !profile && !isGuest) {
    return (
      <View style={styles.container}>
        {hideHeader ? null : <ScreenHeader title={t('profile.title')} />}
        <AppSpinner />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, hideHeader ? styles.drawerContent : styles.pageContent]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadProfile(true);
          }}
          tintColor={colors.secondary}
        />
      }
    >
      {hideHeader ? null : <ScreenHeader title={t('profile.title')} />}

      {error && !isGuest ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={isGuest ? onRequestAuth : isDriver && onOpenDriverProfile ? onOpenDriverProfile : onOpenPersonalInfo}
        style={styles.identity}
        accessibilityRole="button"
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2}>
            {displayName}
          </Text>
          {isDriver && driverProfile?.accountStatusLabel ? (
            <Text style={styles.status}>{driverProfile.accountStatusLabel}</Text>
          ) : contactLine ? (
            <Text style={styles.contact} numberOfLines={1}>
              {contactLine}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <ProfileSection title={t('profile.account')}>
        {isGuest ? (
          <>
            <ProfileMenuItem icon="log-in" label={t('profile.signIn')} onPress={onRequestAuth} />
            <ProfileMenuItem icon="user-plus" label={t('profile.signUp')} onPress={onRequestAuth} last />
          </>
        ) : (
          <>
            <ProfileMenuItem
              icon="user"
              label={t('profile.personalInfo')}
              onPress={onOpenPersonalInfo}
              last={!onOpenNotifications}
            />
            {onOpenNotifications ? (
              <ProfileMenuItem
                icon="bell"
                label={t('profile.notifications')}
                value={unreadCount > 0 ? String(unreadCount) : undefined}
                onPress={onOpenNotifications}
                last
              />
            ) : null}
          </>
        )}
      </ProfileSection>

      {isDriver && !isGuest ? (
        <ProfileSection title={t('profile.driver')}>
          {onOpenDriverProfile ? (
            <ProfileMenuItem
              icon="truck"
              label={t('profile.driverProfile')}
              subtitle={t('profile.driverProfileSubtitle')}
              onPress={onOpenDriverProfile}
            />
          ) : null}
          <ProfileMenuItem
            icon="briefcase"
            label={t('profile.organization')}
            value={organizationName ?? t('driverProfile.organizationUnknown')}
            showChevron={false}
            last
          />
        </ProfileSection>
      ) : null}

      <ProfileSection title={t('profile.application')}>
        <ProfileMenuItem
          icon="globe"
          label={t('profile.language')}
          value={LANGUAGE_LABELS[language]}
          onPress={onOpenLanguage}
        />
        <ProfileMenuItem
          icon="moon"
          label={t('profile.appearance')}
          value={t(`appearanceSettings.${theme}`)}
          onPress={onOpenAppearance}
          last
        />
      </ProfileSection>

      <ProfileSection title={isDriver ? t('profile.assistance') : t('profile.support')}>
        {isDriver && onContactDispatch ? (
          <ProfileMenuItem
            icon="message-circle"
            label={t('courier.contactDispatch')}
            onPress={onContactDispatch}
          />
        ) : null}
        <ProfileMenuItem icon="help-circle" label={t('profile.help')} onPress={onOpenHelp} />
        {onOpenHowItWorks ? (
          <ProfileMenuItem icon="info" label={t('profile.howItWorks')} onPress={onOpenHowItWorks} />
        ) : null}
        <ProfileMenuItem icon="file-text" label={t('profile.terms')} onPress={onOpenTerms} />
        <ProfileMenuItem icon="shield" label={t('profile.privacy')} onPress={onOpenPrivacy} />
        <ProfileMenuItem icon="info" label={t('profile.about')} onPress={onOpenAbout} last />
      </ProfileSection>

      {!isGuest ? (
        <ProfileSection>
          <ProfileMenuItem
            icon="log-out"
            label={t('profile.signOut')}
            onPress={() => void supabase.auth.signOut()}
            destructive
            showChevron={false}
            last={false}
          />
          <ProfileMenuItem
            icon="log-out"
            label={mode === 'DRIVER' ? t('profile.deactivateAccount') : t('profile.deleteAccount')}
            onPress={() => confirmCloseAccount()}
            destructive
            showChevron={false}
            last
          />
        </ProfileSection>
      ) : null}

      <Text style={styles.version}>{t('profile.version')}</Text>
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
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    pageContent: {
      paddingTop: 8,
    },
    drawerContent: {
      paddingTop: 0,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
      marginBottom: 12,
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
      paddingVertical: 4,
    },
    identityText: {
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.onPrimary,
    },
    name: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
    },
    contact: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
    status: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    version: {
      marginTop: 24,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.5,
      color: colors.secondary,
      opacity: 0.4,
    },
  });
}
