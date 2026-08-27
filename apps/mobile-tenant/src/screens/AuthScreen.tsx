import { nativeRadius as radius, type ColorTokens } from '@eveider/config-ui';
import type { UserRole } from '@eveider/domain';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenScaffold } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { acceptInvite, type InvitePreview } from '../lib/invite';
import { apiFetch } from '../lib/api-fetch';
import { supabase } from '../lib/supabase';
import { useColors } from '../theme';

type AuthMode = 'login' | 'register' | 'complete' | 'forgot' | 'reset';

type AuthScreenProps = {
  inviteToken?: string;
  invitePreview?: InvitePreview;
  /** Open directly on profile completion (session exists, profile missing). */
  initialMode?: AuthMode;
  /** Prevents App.tsx from signing the user out mid-signup. */
  onAuthBusyChange?: (busy: boolean) => void;
  onAuthenticated: (role: UserRole, parcelId?: string) => void;
  /** Optional login can be dismissed back to guest home. */
  onDismiss?: () => void;
};

function passwordResetRedirect() {
  if (Platform.OS === 'web') {
    const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
    if (origin) return origin;
  }
  return 'eveider://reset-password';
}

export function AuthScreen({
  inviteToken,
  invitePreview,
  initialMode,
  onAuthBusyChange,
  onAuthenticated,
  onDismiss,
}: AuthScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>(
    initialMode ?? (inviteToken ? 'register' : 'login'),
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(invitePreview?.recipientPhone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  async function callOnboard(token: string) {
    return apiFetch<{ id: string; role: UserRole }>('/api/auth/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role: 'customer',
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        inviteToken,
      }),
    });
  }

  async function enterApp(token: string, userRole: UserRole) {
    if (inviteToken) {
      await acceptInvite(inviteToken, token);
    }
    setBusy(false);
    onAuthenticated(userRole, invitePreview?.parcel.id);
  }

  async function ensureProfileAndEnter(token: string) {
    const meResult = await apiFetch<{ profile: { role: UserRole } }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (meResult.success) {
      await enterApp(token, meResult.data.profile.role);
      return;
    }

    if (!meResult.error.toLowerCase().includes('introuvable')) {
      setBusy(false);
      setError(meResult.error);
      return;
    }

    if (!phone.trim()) {
      setBusy(false);
      setMode('complete');
      setError('Indiquez le téléphone destinataire, puis validez.');
      return;
    }

    const onboardResult = await callOnboard(token);
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

    await ensureProfileAndEnter(token);
  }

  async function handleRegister() {
    if (!phone.trim()) {
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

    await ensureProfileAndEnter(token);
  }

  async function handleCompleteProfile() {
    if (!phone.trim()) {
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

    await ensureProfileAndEnter(token);
  }

  async function handleForgot() {
    if (!email.trim()) {
      setError('Indiquez l’adresse e-mail du compte.');
      return;
    }

    setError(null);
    setInfo(null);
    setBusy(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: passwordResetRedirect(),
    });

    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }

    setInfo('Un e-mail de réinitialisation a été envoyé. Ouvrez le lien depuis cet appareil.');
  }

  async function handleResetPassword() {
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setError(null);
    setBusy(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError(updateError.message);
      return;
    }

    const token = await resolveToken();
    if (!token) {
      setBusy(false);
      setMode('login');
      setInfo('Mot de passe mis à jour. Connectez-vous.');
      return;
    }

    await ensureProfileAndEnter(token);
  }

  function switchToLogin() {
    setMode('login');
    setError(null);
    setInfo(null);
  }

  function switchToRegister() {
    setMode('register');
    setError(null);
    setInfo(null);
  }

  const title =
    mode === 'register'
      ? t('auth.register')
      : mode === 'complete'
        ? t('auth.complete')
        : mode === 'forgot'
          ? t('auth.forgot')
          : mode === 'reset'
            ? t('auth.reset')
            : t('auth.login');

  const handleBack =
    mode === 'login' || mode === 'register' ? onDismiss : switchToLogin;

  const hint =
    mode === 'forgot'
      ? t('auth.forgotHint')
      : mode === 'reset'
        ? t('auth.resetHint')
        : mode === 'complete'
          ? t('auth.completeHint')
          : null;

  const submitLabel =
    mode === 'forgot'
      ? t('auth.sendLink')
      : mode === 'reset'
        ? t('auth.save')
        : mode === 'complete'
          ? t('auth.openApp')
          : mode === 'register'
            ? t('auth.createAccount')
            : t('auth.signIn');

  function handleSubmit() {
    if (mode === 'login') void handleLogin();
    else if (mode === 'register') void handleRegister();
    else if (mode === 'complete') void handleCompleteProfile();
    else if (mode === 'forgot') void handleForgot();
    else void handleResetPassword();
  }

  return (
    <ScreenScaffold title={title} onBack={handleBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {invitePreview && (mode === 'register' || mode === 'complete') ? (
          <View style={styles.inviteBanner}>
            <Text style={styles.inviteTitle}>{invitePreview.business}</Text>
            <Text style={styles.inviteText}>
              {t('auth.inviteMessage', {
                business: invitePreview.business,
                tracking: invitePreview.parcel.trackingNumber ?? invitePreview.parcel.reference,
                phone: invitePreview.recipientPhone,
              })}
            </Text>
          </View>
        ) : null}

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        {mode !== 'reset' ? (
          <TextField
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
          />
        ) : null}

        {mode !== 'forgot' ? (
          <PasswordInput
            label={mode === 'reset' ? t('auth.newPassword') : t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            autoComplete={mode === 'register' || mode === 'reset' ? 'new-password' : 'current-password'}
          />
        ) : null}

        {mode === 'register' || mode === 'complete' ? (
          <TextField
            label={t('auth.phone')}
            placeholder="+243800000000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton label={submitLabel} loading={loading} onPress={handleSubmit} />

          {mode === 'login' ? (
            <View style={styles.links}>
              <Pressable onPress={switchToRegister} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>{t('auth.createAccountLink')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setError(null);
                  setInfo(null);
                  setMode('forgot');
                }}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
              </Pressable>
            </View>
          ) : null}

          {mode === 'register' ? (
            <Pressable onPress={switchToLogin} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{t('auth.alreadyHaveAccount')}</Text>
            </Pressable>
          ) : null}

          {mode === 'complete' || mode === 'forgot' ? (
            <Pressable onPress={switchToLogin} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{t('auth.backToLogin')}</Text>
            </Pressable>
          ) : null}
        </View>
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
      paddingTop: 20,
      paddingBottom: 40,
    },
    hint: {
      marginBottom: 20,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 20,
    },
    inviteBanner: {
      marginBottom: 20,
      padding: 14,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceSubtle,
    },
    inviteTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.secondary,
    },
    inviteText: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
    },
    actions: {
      marginTop: 8,
      gap: 20,
    },
    links: {
      gap: 14,
    },
    link: {
      fontWeight: '600',
      fontSize: 14,
      color: colors.primary,
    },
    error: {
      marginBottom: 12,
      color: colors.danger,
      fontWeight: '600',
      fontSize: 13,
      lineHeight: 18,
    },
    info: {
      marginBottom: 12,
      color: colors.secondary,
      fontWeight: '500',
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
