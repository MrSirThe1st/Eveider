import type { UserRole } from '@eveider/domain';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/i18n';
import { SettingsProvider, useSettings } from './src/context/settings-context';
import { ThemeProvider, useAppTheme } from './src/theme';
import { apiFetch } from './src/lib/api-fetch';
import { isPasswordResetUrl, parseAuthCallbackUrl } from './src/lib/auth-links';
import { acceptInvite, fetchInvitePreview, parseInviteToken, type InvitePreview } from './src/lib/invite';
import { getAuthApiUrl, supabase } from './src/lib/supabase';
import { MobileTabs } from './src/navigation/MobileTabs';
import { AuthScreen } from './src/screens/AuthScreen';
import { LocaleSetupScreen } from './src/screens/LocaleSetupScreen';

SplashScreen.preventAutoHideAsync();

type AppState =
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

async function fetchMe(accessToken: string) {
  return apiFetch<{ profile: { role: UserRole } }>('/api/auth/me', {
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

function AppContent() {
  const { ready, setupComplete } = useSettings();
  const { colors, scheme, navigationTheme } = useAppTheme();
  const [state, setState] = useState<AppState>(GUEST_HOME);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const authInProgressRef = useRef(false);
  const resetPasswordRef = useRef(false);

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    if (!ready || !setupComplete) return;

    let mounted = true;

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

      if (
        meResult.success &&
        meResult.data &&
        MOBILE_ROLES.includes(meResult.data.profile.role as (typeof MOBILE_ROLES)[number])
      ) {
        let initialParcelId: string | undefined;
        if (inviteToken) {
          const preview = await fetchInvitePreview(inviteToken);
          if (preview.success) {
            initialParcelId = preview.data.invite.parcel.id;
          }
        }

        if (mounted) {
          setState({
            kind: 'home',
            role: meResult.data.profile.role,
            guest: false,
            initialParcelId,
          });
        }
        return;
      }

      if (!meResult.success && isMissingProfile(meResult.error)) {
        if (mounted) {
          const inviteContext = inviteToken ? await loadInviteContext(inviteToken) : null;
          setState({
            kind: 'auth',
            inviteToken: inviteContext?.token,
            invitePreview: inviteContext?.preview ?? undefined,
            needsProfile: true,
          });
        }
        return;
      }

      if (!meResult.success && isInvalidSession(meResult.error) && !authInProgressRef.current) {
        await supabase.auth.signOut();
        if (mounted) {
          setState(GUEST_HOME);
        }
        return;
      }

      if (mounted) {
        setState(GUEST_HOME);
      }
    }

    async function consumeAuthUrl(url: string | null): Promise<boolean> {
      if (!url || !isPasswordResetUrl(url)) return false;
      const params = parseAuthCallbackUrl(url);
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        return !error;
      }
      if (params.accessToken && params.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        return !error;
      }
      return false;
    }

    async function bootstrap() {
      try {
        const initialUrl = await Linking.getInitialURL();
        const recovered = await consumeAuthUrl(initialUrl);
        if (recovered) {
          resetPasswordRef.current = true;
          if (mounted) setState({ kind: 'auth', resetPassword: true });
          return;
        }

        const inviteToken = parseInviteToken(initialUrl);
        if (inviteToken) setPendingInviteToken(inviteToken);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (inviteToken) {
            const inviteContext = await loadInviteContext(inviteToken);
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

          if (mounted) setState(GUEST_HOME);
          return;
        }

        await restoreSession(session.access_token, inviteToken);
      } catch {
        if (mounted) setState(GUEST_HOME);
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        resetPasswordRef.current = true;
        setState({ kind: 'auth', resetPassword: true });
        return;
      }

      if (event === 'SIGNED_OUT' || !session) {
        if (authInProgressRef.current) return;
        resetPasswordRef.current = false;
        setState(GUEST_HOME);
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
        if (isPasswordResetUrl(event.url)) {
          const recovered = await consumeAuthUrl(event.url);
          if (recovered && mounted) {
            resetPasswordRef.current = true;
            setState({ kind: 'auth', resetPassword: true });
          }
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
      urlSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, [pendingInviteToken, ready, setupComplete]);

  if (!ready) {
    return <View style={[styles.boot, { backgroundColor: colors.background }]} />;
  }

  if (!setupComplete) {
    return (
      <>
        <LocaleSetupScreen />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
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

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
