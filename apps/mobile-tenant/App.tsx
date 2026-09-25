import type { UserRole } from '@eveider/domain';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/i18n';
import { BootSplash } from './src/components/BootSplash';
import { SettingsProvider, useSettings } from './src/context/settings-context';
import { ThemeProvider, useAppTheme } from './src/theme';
import { apiFetch } from './src/lib/api-fetch';
import { isDriverMagicLinkUrl, isPasswordResetUrl, parseAuthCallbackUrl } from './src/lib/auth-links';
import { acceptInvite, fetchInvitePreview, parseInviteToken, type InvitePreview } from './src/lib/invite';
import { getAuthApiUrl, supabase } from './src/lib/supabase';
import { MobileTabs } from './src/navigation/MobileTabs';
import { AuthScreen } from './src/screens/AuthScreen';
import { LocaleSetupScreen } from './src/screens/LocaleSetupScreen';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const BOOT_TIMEOUT_MS = 8_000;
async function applyOtaUpdateIfAvailable() {
  if (__DEV__) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[eveider:updates] check/fetch failed:', error);
  }
}

type AppState =
  | { kind: 'booting' }
  | {
      kind: 'auth';
      inviteToken?: string;
      invitePreview?: InvitePreview;
      needsProfile?: boolean;
      resetPassword?: boolean;
      optional?: boolean;
      authMode?: 'login' | 'register';
    }
  | { kind: 'home'; role: UserRole; guest: boolean; initialParcelId?: string };

const MOBILE_ROLES = ['customer', 'courier', 'driver'] as const;

const GUEST_HOME: AppState = { kind: 'home', role: 'customer', guest: true };

function isMobileRole(role: string | undefined | null): role is (typeof MOBILE_ROLES)[number] {
  return Boolean(role && (MOBILE_ROLES as readonly string[]).includes(role));
}

async function fetchMe(accessToken: string) {
  return apiFetch<{ profile: { role: UserRole | 'courier' | 'business' } }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function isMissingProfile(message: string) {
  return message.toLowerCase().includes('introuvable');
}

function isInvalidSession(message: string) {
  const lower = message.toLowerCase();
  return lower.includes('non authentifié') || lower.includes('invalid jwt') || lower.includes('jwt expired');
}

async function completeDriverInvite(accessToken: string) {
  await apiFetch('/api/driver-invite/complete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function AppContent() {
  const { ready, setupComplete } = useSettings();
  const { scheme, navigationTheme } = useAppTheme();
  const [state, setState] = useState<AppState>({ kind: 'booting' });
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const authInProgressRef = useRef(false);
  const resetPasswordRef = useRef(false);

  const showNativeSplash = !ready || (setupComplete && state.kind === 'booting');

  useEffect(() => {
    void applyOtaUpdateIfAvailable();
  }, []);

  useEffect(() => {
    if (showNativeSplash) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [showNativeSplash]);

  useEffect(() => {
    if (!ready || !setupComplete) return;

    let mounted = true;
    let bootSettled = false;

    function applyState(next: AppState) {
      if (!mounted) return;
      if (!bootSettled) {
        bootSettled = true;
        clearTimeout(bootTimeout);
      }
      setState(next);
    }

    const bootTimeout = setTimeout(() => {
      console.warn(
        '[eveider:boot] Timed out restoring session — continuing as guest. Check network / EXPO_PUBLIC_AUTH_API_URL.',
      );
      applyState(GUEST_HOME);
    }, BOOT_TIMEOUT_MS);
    async function loadInviteContext(token: string) {
      const preview = await fetchInvitePreview(token);
      if (!mounted) return { token, preview: null as InvitePreview | null };

      if (preview.success) {
        return { token, preview: preview.data.invite };
      }
      return { token, preview: null };
    }

    async function restoreSession(accessToken: string, inviteToken?: string | null) {
      if (authInProgressRef.current) {
        return;
      }

      if (inviteToken) {
        const accepted = await acceptInvite(inviteToken, accessToken);
        if (!accepted.success && mounted) {
          console.warn('[eveider:invite] accept failed:', accepted.error);
        }
      }

      const meResult = await fetchMe(accessToken);
      const role = meResult.success ? meResult.data.profile.role : null;

      if (meResult.success && isMobileRole(role)) {
        let initialParcelId: string | undefined;
        if (inviteToken) {
          const preview = await fetchInvitePreview(inviteToken);
          if (preview.success) {
            initialParcelId = preview.data.invite.parcel.id;
          }
        }

        applyState({
          kind: 'home',
          role: role === 'courier' ? 'driver' : role,
          guest: false,
          initialParcelId,
        });
        return;
      }

      if (!meResult.success && isMissingProfile(meResult.error)) {
        const inviteContext = inviteToken ? await loadInviteContext(inviteToken) : null;
        applyState({
          kind: 'auth',
          inviteToken: inviteContext?.token,
          invitePreview: inviteContext?.preview ?? undefined,
          needsProfile: true,
        });
        return;
      }

      if (!meResult.success && isInvalidSession(meResult.error) && !authInProgressRef.current) {
        await supabase.auth.signOut();
        applyState(GUEST_HOME);
        return;
      }

      // Offline / unreachable API — avoid authenticated screens that would spam
      // the same Network request failed errors while Supabase keeps retrying.
      if (
        !meResult.success &&
        (meResult.error.includes('Serveur inaccessible') || meResult.error.includes('Délai'))
      ) {
        console.warn('[eveider:boot] API unreachable during session restore:', meResult.error);
        applyState(GUEST_HOME);
        return;
      }

      // Valid Supabase session but /me failed (other) or role not mobile —
      // never demote to guest while a token still exists.
      if (meResult.success && !isMobileRole(role)) {
        applyState(GUEST_HOME);
        return;
      }

      applyState({ kind: 'home', role: 'customer', guest: false });
    }

    async function consumeAuthUrl(url: string | null): Promise<'reset' | 'magic' | null> {
      if (!url) return null;
      const params = parseAuthCallbackUrl(url);
      const isMagic =
        Boolean(params.tokenHash) &&
        (params.type === 'magiclink' || (!params.type && isDriverMagicLinkUrl(url)));

      if (isMagic && params.tokenHash) {
        // Supabase deprecated verifyOtp type `magiclink` — prefer `email`, with fallback.
        const primary = await supabase.auth.verifyOtp({
          token_hash: params.tokenHash,
          type: 'email',
        });
        if (!primary.error) return 'magic';
        const fallback = await supabase.auth.verifyOtp({
          token_hash: params.tokenHash,
          type: 'magiclink',
        });
        return fallback.error ? null : 'magic';
      }

      if (!isPasswordResetUrl(url)) return null;
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        return error ? null : 'reset';
      }
      if (params.accessToken && params.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        return error ? null : 'reset';
      }
      return null;
    }

    async function finishMagicLink() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await completeDriverInvite(session.access_token);
      await restoreSession(session.access_token);
    }

    async function bootstrap() {
      try {
        const initialUrl = await Linking.getInitialURL();
        const recovered = await consumeAuthUrl(initialUrl);
        if (recovered === 'reset') {
          resetPasswordRef.current = true;
          applyState({ kind: 'auth', resetPassword: true });
          return;
        }
        if (recovered === 'magic') {
          await finishMagicLink();
          if (!bootSettled) applyState(GUEST_HOME);
          return;
        }

        const inviteToken = parseInviteToken(initialUrl);
        if (inviteToken) setPendingInviteToken(inviteToken);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('[eveider:boot] getSession failed:', sessionError.message);
          // Stale refresh tokens + no network cause AuthRetryableFetchError loops.
          await supabase.auth.signOut({ scope: 'local' });
          applyState(GUEST_HOME);
          return;
        }

        if (!session) {
          if (inviteToken) {
            const inviteContext = await loadInviteContext(inviteToken);
            applyState({
              kind: 'auth',
              inviteToken: inviteContext.token,
              invitePreview: inviteContext.preview ?? undefined,
              optional: true,
            });
            return;
          }

          applyState(GUEST_HOME);
          return;
        }

        await restoreSession(session.access_token, inviteToken);
        if (!bootSettled) applyState(GUEST_HOME);
      } catch (error) {
        console.warn('[eveider:boot] bootstrap failed:', error);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        applyState(GUEST_HOME);
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        resetPasswordRef.current = true;
        applyState({ kind: 'auth', resetPassword: true });
        return;
      }

      // Only explicit sign-out clears the session. INITIAL_SESSION with a null
      // session must not wipe a restore that bootstrap is about to finish.
      if (event === 'SIGNED_OUT') {
        if (authInProgressRef.current) return;
        resetPasswordRef.current = false;
        applyState(GUEST_HOME);
        return;
      }

      if (!session) {
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        if (authInProgressRef.current || resetPasswordRef.current) return;
        await restoreSession(session.access_token, pendingInviteToken);
      }
    });

    void bootstrap();

    const urlSubscription = Linking.addEventListener('url', (event: { url: string }) => {
      void (async () => {
        const recovered = await consumeAuthUrl(event.url);
        if (recovered === 'reset') {
          resetPasswordRef.current = true;
          if (mounted) setState({ kind: 'auth', resetPassword: true });
          return;
        }
        if (recovered === 'magic') {
          await finishMagicLink();
          return;
        }

        const token = parseInviteToken(event.url);
        if (!token) return;
        setPendingInviteToken(token);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const inviteContext = await loadInviteContext(token);
          if (mounted) {
            setState({
              kind: 'auth',
              inviteToken: inviteContext.token,
              invitePreview: inviteContext.preview ?? undefined,
              optional: true,
            });
          }
          return;
        }

        await restoreSession(session.access_token, token);
      })();
    });

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
      urlSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, [pendingInviteToken, ready, setupComplete]);

  if (!ready) {
    return <BootSplash />;
  }

  if (!setupComplete) {
    return (
      <>
        <LocaleSetupScreen />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  if (state.kind === 'booting') {
    return <BootSplash />;
  }

  if (state.kind === 'auth') {
    return (
      <>
        <AuthScreen
          inviteToken={state.inviteToken}
          invitePreview={state.invitePreview}
          initialMode={
            state.resetPassword ? 'reset' : state.needsProfile ? 'complete' : state.authMode
          }
          onDismiss={
            state.optional
              ? () => {
                  setState(GUEST_HOME);
                }
              : undefined
          }
          onAuthBusyChange={(busy) => {
            authInProgressRef.current = busy;
          }}
          onAuthenticated={(role, parcelId) => {
            authInProgressRef.current = false;
            resetPasswordRef.current = false;
            setState({ kind: 'home', role, guest: false, initialParcelId: parcelId });
          }}
        />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <>
      <NavigationContainer
        theme={navigationTheme}
        linking={{
          prefixes: ['eveider://', getAuthApiUrl(), 'http://localhost:3000', 'http://localhost:19006'],
          config: {
            screens: {
              Colis: 'invite/:token',
            },
          },
        }}
      >
        <MobileTabs
          role={state.role}
          initialParcelId={state.initialParcelId}
          isGuest={state.guest}
          onRequestAuth={(mode) => setState({ kind: 'auth', optional: true, authMode: mode })}
        />
      </NavigationContainer>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}