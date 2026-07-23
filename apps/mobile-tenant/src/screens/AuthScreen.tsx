import { colors, radius, spacing, borders } from '@eveider/config-ui';
import type { UserRole } from '@eveider/domain';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PasswordInput } from '../components/PasswordInput';
import { acceptInvite } from '../lib/invite';
import { apiFetch } from '../lib/api-fetch';
import { authApiUrl, supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register' | 'complete';

type AuthScreenProps = {
  inviteToken?: string;
  invitePreview?: {
    business: string;
    recipientPhone: string;
    recipientName: string | null;
    parcel: { id: string; reference: string; locker: string | null };
  };
  /** Open directly on profile completion (session exists, profile missing). */
  initialMode?: AuthMode;
  /** Prevents App.tsx from signing the user out mid-signup. */
  onAuthBusyChange?: (busy: boolean) => void;
  onAuthenticated: (role: UserRole, parcelId?: string) => void;
};

export function AuthScreen({
  inviteToken,
  invitePreview,
  initialMode,
  onAuthBusyChange,
  onAuthenticated,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(
    initialMode ?? (inviteToken ? 'register' : 'login'),
  );
  const [role, setRole] = useState<UserRole>(inviteToken ? 'customer' : 'customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(invitePreview?.recipientPhone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  function setBusy(busy: boolean) {
    onAuthBusyChange?.(busy);
    setLoading(busy);
  }

  async function resolveToken(preferred?: string | null) {
    if (preferred) return preferred;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? '';
  }

  async function callOnboard(token: string, onboardRole: UserRole) {
    return apiFetch<{ id: string; role: UserRole }>('/api/auth/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role: onboardRole,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        inviteToken,
      }),
    });
  }

  /** Normal path: session + Eveider profile → home. */
  async function enterApp(token: string, userRole: UserRole) {
    if (inviteToken) {
      await acceptInvite(inviteToken, token);
    }
    setBusy(false);
    onAuthenticated(userRole, invitePreview?.parcel.id);
  }

  /**
   * Ensure Eveider profile exists then go home.
   * This is signup/login as the user expects: create/login → home.
   */
  async function ensureProfileAndEnter(token: string, onboardRole: UserRole) {
    const meResult = await apiFetch<{ profile: { role: UserRole } }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (meResult.success) {
      await enterApp(token, meResult.data.profile.role);
      return;
    }

    if (!meResult.error.toLowerCase().includes('introuvable')) {
      setBusy(false);
      setError(
        `${meResult.error}\n\nImpossible de joindre l’API (${authApiUrl}). ` +
          'Lancez web-manager et vérifiez EXPO_PUBLIC_AUTH_API_URL, puis réessayez.',
      );
      return;
    }

    if (onboardRole === 'customer' && !phone.trim()) {
      setBusy(false);
      setMode('complete');
      setError('Indiquez le téléphone destinataire, puis validez.');
      return;
    }

    const onboardResult = await callOnboard(token, onboardRole);
    if (!onboardResult.success) {
      setBusy(false);
      setMode('complete');
      setError(onboardResult.error);
      return;
    }

    await enterApp(token, onboardResult.data.role);
  }

  async function handleLogin() {
    setError(null);
    setBusy(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setBusy(false);
      setError(signInError.message);
      return;
    }

    const token = await resolveToken(data.session?.access_token);
    if (!token) {
      setBusy(false);
      setError('Session vide après connexion. Réessayez.');
      return;
    }

    await ensureProfileAndEnter(token, role);
  }

  async function handleRegister() {
    if (role === 'customer' && !phone.trim()) {
      setError('Téléphone requis pour les comptes client');
      return;
    }

    setError(null);
    setBusy(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    let token = data.session?.access_token ?? '';

    if (signUpError) {
      const alreadyExists = /already|registered|exists|déjà/i.test(signUpError.message);

      if (!alreadyExists) {
        setBusy(false);
        setError(signUpError.message);
        return;
      }

      // Account already in Supabase → just sign in and finish profile if needed.
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setBusy(false);
        setError('Ce compte existe déjà. Utilisez CONNEXION avec le même mot de passe.');
        setMode('login');
        return;
      }
      token = signInData.session?.access_token ?? '';
    }

    token = await resolveToken(token);
    if (!token) {
      setBusy(false);
      setError(
        'Compte Auth créé mais session absente. Désactivez « Confirm email » dans Supabase Auth, puis connectez-vous.',
      );
      return;
    }

    await ensureProfileAndEnter(token, role);
  }

  async function handleCompleteProfile() {
    if (role === 'customer' && !phone.trim()) {
      setError('Téléphone requis pour les comptes client');
      return;
    }

    setError(null);
    setBusy(true);

    let token = await resolveToken();
    if (!token && email.trim() && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setBusy(false);
        setError(error.message);
        setMode('login');
        return;
      }
      token = data.session?.access_token ?? '';
    }

    if (!token) {
      setBusy(false);
      setError('Session expirée — reconnectez-vous.');
      setMode('login');
      return;
    }

    await ensureProfileAndEnter(token, role);
  }

  function switchToLogin() {
    setMode('login');
    setError(null);
  }

  function switchToRegister() {
    setMode('register');
    setError(null);
  }

  if (mode === 'register' || mode === 'complete') {
    const isComplete = mode === 'complete';

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.eyebrow}>{isComplete ? 'FINALISER LE COMPTE' : 'INSCRIPTION'}</Text>

          {invitePreview ? (
            <View style={styles.inviteBanner}>
              <Text style={styles.inviteTitle}>{invitePreview.business}</Text>
              <Text style={styles.inviteText}>
                vous a envoyé le colis {invitePreview.parcel.trackingNumber ?? invitePreview.parcel.reference}. Utilisez le numéro{' '}
                {invitePreview.recipientPhone}.
              </Text>
            </View>
          ) : null}

          {isComplete ? (
            <Text style={styles.hintBlock}>
              Choisissez CLIENT ou COURSIER, puis validez pour ouvrir l’app.
            </Text>
          ) : null}

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="vous@exemple.cd"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>MOT DE PASSE</Text>
          <PasswordInput
            placeholder="8 caractères minimum"
            value={password}
            onChangeText={setPassword}
            autoComplete={isComplete ? 'current-password' : 'new-password'}
          />

          {!inviteToken ? (
            <>
              <Text style={styles.label}>RÔLE</Text>
              <View style={styles.roleRow}>
                <Pressable
                  style={[styles.roleChip, role === 'customer' && styles.roleChipActive]}
                  onPress={() => setRole('customer')}
                >
                  <Text style={styles.roleText}>CLIENT</Text>
                </Pressable>
                <Pressable
                  style={[styles.roleChip, role === 'courier' && styles.roleChipActive]}
                  onPress={() => setRole('courier')}
                >
                  <Text style={styles.roleText}>COURSIER</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          <Text style={styles.label}>
            {role === 'customer' ? 'TÉLÉPHONE (destinataire colis)' : 'TÉLÉPHONE (optionnel)'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="+243800000000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={styles.primaryButton}
            disabled={loading}
            onPress={() => {
              if (isComplete) void handleCompleteProfile();
              else void handleRegister();
            }}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'CHARGEMENT…' : isComplete ? 'OUVRIR L’APP' : 'CRÉER LE COMPTE'}
            </Text>
          </Pressable>

          <Pressable onPress={switchToLogin}>
            <Text style={styles.link}>
              {isComplete ? '← Retour connexion' : 'Déjà un compte ? Connexion'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text style={styles.eyebrow}>CONNEXION</Text>

        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="vous@exemple.cd"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Text style={styles.label}>MOT DE PASSE</Text>
        <PasswordInput
          placeholder="8 caractères minimum"
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
        />

        <Text style={styles.label}>RÔLE (si profil à créer)</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleChip, role === 'customer' && styles.roleChipActive]}
            onPress={() => setRole('customer')}
          >
            <Text style={styles.roleText}>CLIENT</Text>
          </Pressable>
          <Pressable
            style={[styles.roleChip, role === 'courier' && styles.roleChipActive]}
            onPress={() => setRole('courier')}
          >
            <Text style={styles.roleText}>COURSIER</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.primaryButton}
          disabled={loading}
          onPress={() => void handleLogin()}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'CHARGEMENT…' : 'SE CONNECTER'}
          </Text>
        </Pressable>

        <Pressable onPress={switchToRegister}>
          <Text style={styles.link}>Créer un compte</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const base = authApiUrl.replace(/\/$/, '');
            void Linking.openURL(`${base}/suivi`);
          }}
        >
          <Text style={styles.link}>Suivre un colis sans compte →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  form: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    color: colors.secondary,
  },
  hintBlock: {
    marginBottom: 16,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
    lineHeight: 20,
  },
  inviteBanner: {
    marginBottom: 16,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: borders.width,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  inviteText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
    color: colors.secondary,
  },
  input: {
    height: spacing.buttonHeight,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    fontWeight: '500',
    color: colors.secondary,
    backgroundColor: colors.surface,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleChip: {
    flex: 1,
    height: 44,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  roleChipActive: {
    backgroundColor: colors.primary,
  },
  roleText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.secondary,
  },
  primaryButton: {
    marginTop: 20,
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.secondary,
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: colors.secondary,
  },
  error: {
    marginTop: 12,
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
});
