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
import { deleteCustomerAccount, deactivateCourierAccount, fetchCustomerNotifications, fetchCourierNotifications, fetchProfile, type UserProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useColors } from '../theme';

type ProfileScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  isGuest?: boolean;
  onRequestAuth?: () => void;
  onOpenNotifications?: () => void;
  onOpenPersonalInfo: () => void;
  onOpenNotificationPreferences: () => void;
  onOpenLanguage: () => void;
  onOpenCountry: () => void;
  onOpenAppearance: () => void;
  onOpenHelp: () => void;
  onOpenHowItWorks?: () => void;
  onOpenMyParcels?: () => void;
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
  onOpenNotificationPreferences,
  onOpenLanguage,
  onOpenCountry,
  onOpenAppearance,
  onOpenHelp,
  onOpenHowItWorks,
  onOpenMyParcels,
  onOpenTerms,
  onOpenPrivacy,
  onOpenAbout,
  hideHeader = false,
}: ProfileScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const { language, country, theme } = useSettings();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomer = mode === 'CLIENT';

  const loadProfile = useCallback(async (silent = false) => {
    if (isGuest) {
      setProfile(null);
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
      return;
    }

    setProfile(result.data);

    if (isCustomer || mode === 'COURSIER') {
      const notifications = isCustomer
        ? await fetchCustomerNotifications()
        : await fetchCourierNotifications();
      if (notifications.success) {
        setUnreadCount(notifications.data.unreadCount);
      }
    }
  }, [isCustomer, isGuest, mode]);

  function confirmCloseAccount() {
    const isCourier = mode === 'COURSIER';
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

  const displayName = isGuest
    ? t('profile.guestName')
    : (profile?.profile.fullName ?? profile?.email ?? t('profile.guestName'));
  const roleLabel = isGuest
    ? t('profile.guestRole')
    : profile
      ? t(`roles.${profile.profile.role}`)
      : mode === 'COURSIER'
        ? t('roles.courier')
        : t('roles.customer');

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
        onPress={isGuest ? onRequestAuth : onOpenPersonalInfo}
        style={styles.identity}
        accessibilityRole="button"
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{displayName}</Text>
          {roleLabel ? <Text style={styles.roleLabel}>{roleLabel}</Text> : null}
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
            />
            {isCustomer ? (
              <ProfileMenuItem
                icon="package"
                label={t('profile.myParcels')}
                onPress={onOpenMyParcels}
              />
            ) : null}
            {isCustomer ? (
              <ProfileMenuItem
                icon="bell"
                label={t('profile.notifications')}
                value={unreadCount > 0 ? String(unreadCount) : undefined}
                onPress={onOpenNotifications}
              />
            ) : onOpenNotifications ? (
              <ProfileMenuItem
                icon="bell"
                label={t('profile.notifications')}
                value={unreadCount > 0 ? String(unreadCount) : undefined}
                onPress={onOpenNotifications}
              />
            ) : null}
            <ProfileMenuItem
              icon="sliders"
              label={t('profile.notificationPrefs')}
              onPress={onOpenNotificationPreferences}
              last
            />
          </>
        )}
      </ProfileSection>

      <ProfileSection title={t('profile.application')}>
        <ProfileMenuItem
          icon="globe"
          label={t('profile.language')}
          value={LANGUAGE_LABELS[language]}
          onPress={onOpenLanguage}
        />
        <ProfileMenuItem
          icon="map-pin"
          label={t('profile.country')}
          value={t(`countries.${country}`)}
          onPress={onOpenCountry}
        />
        <ProfileMenuItem
          icon="moon"
          label={t('profile.appearance')}
          value={t(`appearanceSettings.${theme}`)}
          onPress={onOpenAppearance}
          last
        />
      </ProfileSection>

      <ProfileSection title={t('profile.support')}>
        <ProfileMenuItem icon="help-circle" label={t('profile.help')} onPress={onOpenHelp} />
        {onOpenHowItWorks ? (
          <ProfileMenuItem icon="info" label={t('profile.howItWorks')} onPress={onOpenHowItWorks} />
        ) : null}
        <ProfileMenuItem icon="file-text" label={t('profile.terms')} onPress={onOpenTerms} />
        <ProfileMenuItem icon="shield" label={t('profile.privacy')} onPress={onOpenPrivacy} />
        <ProfileMenuItem icon="info" label={t('profile.about')} onPress={onOpenAbout} last />
      </ProfileSection>

      {!isGuest ? (
        <ProfileSection title={t('profile.session')}>
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
            label={mode === 'COURSIER' ? t('profile.deactivateAccount') : t('profile.deleteAccount')}
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
  closeRow: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 8,
  },
  close: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  loader: {
    marginTop: 32,
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
  roleLabel: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
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
