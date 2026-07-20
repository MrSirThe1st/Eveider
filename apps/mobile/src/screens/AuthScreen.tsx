import { colors, radius, spacing, borders } from '@eveider/config-ui';
import type { UserRole } from '@eveider/domain';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PasswordInput } from '../components/PasswordInput';
import { acceptInvite } from '../lib/invite';
import { apiFetch } from '../lib/api-fetch';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register' | 'complete';

type AuthScreenProps = {
  inviteToken?: string;
  invitePreview?: {
    business: string;
    recipientPhone: string;
    recipientName: string | null;
    parcel: { id: string; reference: string; locker: string | null };
  };
  onAuthenticated: (role: UserRole, parcelId?: string) => void;
};

export function AuthScreen({ inviteToken, invitePreview, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(inviteToken ? 'register' : 'login');
  const [role, setRole] = useState<UserRole>(inviteToken ? 'customer' : 'customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(invitePreview?.recipientPhone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? '';
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
        email,
        phone: phone.trim() || undefined,
        inviteToken,
      }),
    });
  }

  async function finishAuth(accessToken: string, userRole: UserRole) {
    if (inviteToken) {
      await acceptInvite(inviteToken, accessToken);
    }
    onAuthenticated(userRole, invitePreview?.parcel.id);
  }

  async function handleLogin() {
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const token = await getAccessToken();
    const meResult = await apiFetch<{ profile: { role: UserRole } }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (meResult.success) {
      setLoading(false);
      await finishAuth(token, meResult.data.profile.role);
      return;
    }

    if (meResult.error.includes('introuvable')) {
      setLoading(false);
      setMode('complete');
      setError(
        'Compte Supabase trouvé mais profil Eveider manquant. Complétez l’inscription ci-dessous.',
      );
      return;
    }

    setLoading(false);
    setError(meResult.error);
    await supabase.auth.signOut();
  }

  async function handleRegister() {
    if (role === 'customer' && !phone.trim()) {
      setError('Téléphone requis pour retrouver vos colis');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      const alreadyExists =
        /already|registered|exists|déjà/i.test(signUpError.message) ||
        signUpError.message.toLowerCase().includes('user already');

      // Supabase user may already exist from a previous attempt where onboard failed.
      if (alreadyExists) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setLoading(false);
          setError(
            'Ce compte existe déjà. Connectez-vous avec le même email/mot de passe, ou finalisez le profil.',
          );
          setMode('login');
          return;
        }

        const token = await getAccessToken();
        const meResult = await apiFetch<{ profile: { role: UserRole } }>('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (meResult.success) {
          setLoading(false);
          await finishAuth(token, meResult.data.profile.role);
          return;
        }

        setLoading(false);
        setMode('complete');
        setError(
          'Compte trouvé mais profil Eveider incomplet. Appuyez sur FINALISER (vérifiez aussi EXPO_PUBLIC_AUTH_API_URL).',
        );
        return;
      }

      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setError(
        'Compte créé mais connexion impossible. Désactivez la confirmation email dans Supabase (Auth → Providers → Email).',
      );
      return;
    }

    const token = await getAccessToken();
    const onboardResult = await callOnboard(token, role);

    setLoading(false);
    if (!onboardResult.success) {
      // Keep Supabase session so the user can retry FINALISER without "already exists".
      setMode('complete');
      setError(
        `${onboardResult.error}\n\nLe compte Auth a été créé. Corrigez l’URL API si besoin, puis appuyez sur FINALISER.`,
      );
      return;
    }

    await finishAuth(token, onboardResult.data.role);
  }

  async function handleCompleteProfile() {
    if (role === 'customer' && !phone.trim()) {
      setError('Téléphone requis pour retrouver vos colis');
      return;
    }

    setLoading(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setLoading(false);
      setError('Session expirée — reconnectez-vous.');
      setMode('login');
      return;
    }

    const onboardResult = await callOnboard(token, role);

    setLoading(false);
    if (!onboardResult.success) {
      setError(onboardResult.error);
      return;
    }

    await finishAuth(token, onboardResult.data.role);
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
          <Text style={styles.eyebrow}>{isComplete ? 'COMPLÉTER LE PROFIL' : 'INSCRIPTION'}</Text>

          {invitePreview ? (
            <View style={styles.inviteBanner}>
              <Text style={styles.inviteTitle}>{invitePreview.business}</Text>
              <Text style={styles.inviteText}>
                vous a envoyé le colis {invitePreview.parcel.reference}. Créez votre compte avec le
                numéro {invitePreview.recipientPhone}.
              </Text>
            </View>
          ) : null}

          {!isComplete && !inviteToken ? (
            <>
              <Text style={styles.title}>CHOISIR LE RÔLE</Text>
              <Pressable
                style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
                onPress={() => setRole('customer')}
              >
                <Text style={styles.roleText}>CLIENT</Text>
              </Pressable>
              <Pressable
                style={[styles.roleButton, role === 'courier' && styles.roleButtonActive]}
                onPress={() => setRole('courier')}
              >
                <Text style={styles.roleText}>COURSIER</Text>
              </Pressable>
            </>
          ) : isComplete ? (
            <Text style={styles.hintBlock}>
              Votre email est déjà enregistré dans Supabase. Choisissez un rôle et un téléphone pour
              créer le profil Eveider.
            </Text>
          ) : null}

          {!isComplete ? (
            <>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="vous@exemple.cd"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.label}>MOT DE PASSE</Text>
              <PasswordInput
                placeholder="8 caractères minimum"
                value={password}
                onChangeText={setPassword}
                autoComplete="new-password"
              />
            </>
          ) : null}

          {!isComplete && !inviteToken ? (
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
              {loading
                ? 'CHARGEMENT...'
                : isComplete
                  ? 'FINALISER LE PROFIL'
                  : 'CRÉER LE COMPTE'}
            </Text>
          </Pressable>

          <Pressable onPress={switchToLogin}>
            <Text style={styles.link}>{isComplete ? '← Retour connexion' : 'Déjà un compte ? Connexion'}</Text>
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.primaryButton}
          disabled={loading}
          onPress={() => void handleLogin()}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'CHARGEMENT...' : 'SE CONNECTER'}
          </Text>
        </Pressable>

        <Pressable onPress={switchToRegister}>
          <Text style={styles.link}>Créer un compte</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const base = process.env.EXPO_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';
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
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 16,
    color: colors.secondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.secondary,
  },
  hintBlock: {
    marginBottom: 16,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
  },
  inviteBanner: {
    marginBottom: 16,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: borders.width,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 6,
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
    color: colors.secondary,
  },
  input: {
    height: 48,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    fontWeight: '500',
  },
  roleButton: {
    padding: 16,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  roleButtonActive: {
    borderColor: colors.primary,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    padding: 12,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  roleChipActive: {
    borderColor: colors.primary,
  },
  roleText: {
    fontWeight: '600',
    textAlign: 'center',
    color: colors.secondary,
  },
  primaryButton: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  error: {
    color: colors.danger,
    marginTop: 12,
    fontWeight: '500',
    fontSize: 13,
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
    color: colors.secondary,
  },
});
