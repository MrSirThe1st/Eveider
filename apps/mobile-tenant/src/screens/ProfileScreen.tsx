import type { UserRole } from '@eveider/domain';
import { nativeColors as colors, radius, borders } from '@eveider/config-ui';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProfileMenuItem } from '../components/ProfileMenuItem';
import { ScreenHeader } from '../components/ScreenHeader';
import { LANGUAGE_LABELS, THEME_LABELS, useSettings } from '../context/settings-context';
import { fetchCustomerNotifications, fetchProfile, type UserProfile } from '../lib/api';
import { supabase } from '../lib/supabase';

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'CLIENT',
  courier: 'COURSIER',
  business: 'ENTREPRISE',
  admin: 'ADMIN',
  operator: 'OPÉRATEUR',
};

type ProfileScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onOpenNotifications?: () => void;
  onOpenPersonalInfo: () => void;
  onOpenNotificationPreferences: () => void;
  onOpenLanguage: () => void;
  onOpenAppearance: () => void;
  onOpenHelp: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenAbout: () => void;
};

export function ProfileScreen({
  mode,
  onOpenNotifications,
  onOpenPersonalInfo,
  onOpenNotificationPreferences,
  onOpenLanguage,
  onOpenAppearance,
  onOpenHelp,
  onOpenTerms,
  onOpenPrivacy,
  onOpenAbout,
}: ProfileScreenProps) {
  const { language, theme } = useSettings();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomer = mode === 'CLIENT';

  const loadProfile = useCallback(async (silent = false) => {
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

    if (isCustomer) {
      const notifications = await fetchCustomerNotifications();
      if (notifications.success) {
        setUnreadCount(notifications.data.unreadCount);
      }
    }
  }, [isCustomer]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode={mode} title="PARAMÈTRES" />
        <ActivityIndicator color={colors.secondary} style={styles.loader} />
      </View>
    );
  }

  const displayName = profile?.profile.fullName ?? profile?.email ?? 'Utilisateur';
  const roleLabel = profile ? ROLE_LABELS[profile.profile.role] : mode;
  const notificationSubtitle =
    unreadCount > 0
      ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
      : 'Historique des alertes colis';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
      <ScreenHeader mode={mode} title="PARAMÈTRES" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.roleBadge}>{roleLabel}</Text>
        {profile?.email ? <Text style={styles.meta}>{profile.email}</Text> : null}
        {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
      </View>

      <Text style={styles.sectionLabel}>COMPTE</Text>
      <ProfileMenuItem
        icon="user"
        label="INFORMATIONS PERSONNELLES"
        subtitle="Nom, téléphone et e-mail"
        onPress={onOpenPersonalInfo}
      />
      {isCustomer ? (
        <ProfileMenuItem
          icon="bell"
          label="NOTIFICATIONS"
          subtitle={notificationSubtitle}
          onPress={onOpenNotifications}
        />
      ) : null}
      <ProfileMenuItem
        icon="sliders"
        label="PRÉFÉRENCES DE NOTIFICATION"
        subtitle="Push, e-mail et SMS"
        onPress={onOpenNotificationPreferences}
      />

      <Text style={styles.sectionLabel}>APPLICATION</Text>
      <ProfileMenuItem
        icon="globe"
        label="LANGUE"
        subtitle="Langue de l’interface"
        value={LANGUAGE_LABELS[language]}
        onPress={onOpenLanguage}
      />
      <ProfileMenuItem
        icon="moon"
        label="APPARENCE"
        subtitle="Mode clair ou sombre"
        value={THEME_LABELS[theme]}
        onPress={onOpenAppearance}
      />

      <Text style={styles.sectionLabel}>ASSISTANCE</Text>
      <ProfileMenuItem
        icon="help-circle"
        label="AIDE & SUPPORT"
        subtitle="FAQ et contact"
        onPress={onOpenHelp}
      />
      <ProfileMenuItem
        icon="file-text"
        label="CONDITIONS D'UTILISATION"
        onPress={onOpenTerms}
      />
      <ProfileMenuItem
        icon="shield"
        label="CONFIDENTIALITÉ"
        onPress={onOpenPrivacy}
      />
      <ProfileMenuItem icon="info" label="À PROPOS" onPress={onOpenAbout} />

      <Text style={styles.sectionLabel}>SESSION</Text>
      <ProfileMenuItem
        icon="log-out"
        label="DÉCONNEXION"
        onPress={() => void supabase.auth.signOut()}
        destructive
        showChevron={false}
      />

      <Text style={styles.version}>EVEIDER MOBILE · MVP</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 32,
  },
  error: {
    color: colors.danger,
    fontWeight: '500',
    marginBottom: 12,
  },
  identityCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
  },
  roleBadge: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
    opacity: 0.8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.secondary,
    opacity: 0.6,
    marginBottom: 8,
    marginTop: 8,
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
