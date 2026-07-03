import type { UserRole } from '@eveider/domain';
import { colors, radius } from '@eveider/config-ui';
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
import { NotificationsScreen } from './NotificationsScreen';
import { useHideTabBar } from '../navigation/useHideTabBar';
import { fetchCustomerNotifications, fetchProfile, type UserProfile } from '../lib/api';
import { supabase } from '../lib/supabase';

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'CLIENT',
  courier: 'COURSIER',
  business: 'ENTREPRISE',
  admin: 'ADMIN',
};

type ProfileScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
};

type ProfileView = { name: 'main' } | { name: 'notifications' };

export function ProfileScreen({ mode }: ProfileScreenProps) {
  const [view, setView] = useState<ProfileView>({ name: 'main' });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomer = mode === 'CLIENT';

  useHideTabBar(view.name !== 'main');

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

  if (view.name === 'notifications' && isCustomer) {
    return (
      <NotificationsScreen
        mode={mode}
        onBack={() => {
          setView({ name: 'main' });
          void loadProfile(true);
        }}
      />
    );
  }

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode={mode} title="PROFIL" />
        <ActivityIndicator color={colors.secondary} style={styles.loader} />
      </View>
    );
  }

  const displayName = profile?.profile.fullName ?? profile?.email ?? 'Utilisateur';
  const roleLabel = profile ? ROLE_LABELS[profile.profile.role] : mode;
  const notificationSubtitle =
    unreadCount > 0
      ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
      : 'Alertes colis et livraisons';

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
      <ScreenHeader mode={mode} title="PROFIL" />

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
        subtitle="Modifier nom et téléphone"
        disabled
      />
      <ProfileMenuItem
        icon="bell"
        label="NOTIFICATIONS"
        subtitle={isCustomer ? notificationSubtitle : 'Alertes colis et livraisons'}
        disabled={!isCustomer}
        onPress={isCustomer ? () => setView({ name: 'notifications' }) : undefined}
      />

      <Text style={styles.sectionLabel}>ASSISTANCE</Text>
      <ProfileMenuItem icon="help-circle" label="AIDE & SUPPORT" subtitle="FAQ et contact" disabled />
      <ProfileMenuItem icon="file-text" label="CONDITIONS D'UTILISATION" disabled />

      <Text style={styles.sectionLabel}>SESSION</Text>
      <ProfileMenuItem
        icon="log-out"
        label="DÉCONNEXION"
        onPress={() => void supabase.auth.signOut()}
        destructive
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
    borderWidth: 1,
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
