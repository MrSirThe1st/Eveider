import type { UserRole } from '@eveider/domain';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { colors } from '@eveider/config-ui';
import { apiFetch } from './src/lib/api-fetch';
import { acceptInvite, fetchInvitePreview, parseInviteToken, type InvitePreview } from './src/lib/invite';
import { supabase } from './src/lib/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileTabs } from './src/navigation/MobileTabs';

type AppState =
  | { kind: 'loading' }
  | {
      kind: 'auth';
      inviteToken?: string;
      invitePreview?: InvitePreview;
      /** Supabase session exists but Eveider profile row is missing. */
      needsProfile?: boolean;
    }
  | { kind: 'home'; role: UserRole; initialParcelId?: string };

const MOBILE_ROLES = ['customer', 'courier'] as const;

async function fetchMe(accessToken: string) {
  return apiFetch<{ profile: { role: UserRole } }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function isMissingProfile(message: string) {
  return message.toLowerCase().includes('introuvable');
}

/** Invalid/expired token — safe to clear session. Do NOT match "profil introuvable". */
function isInvalidSession(message: string) {
  const lower = message.toLowerCase();
  return lower.includes('non authentifié') || lower.includes('invalid jwt') || lower.includes('jwt expired');
}

export default function App() {
  const [state, setState] = useState<AppState>({ kind: 'loading' });
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  /** While AuthScreen is creating the Eveider profile, ignore restoreSession sign-out races. */
  const authInProgressRef = useRef(false);

  useEffect(() => {
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
            initialParcelId,
          });
        }
        return;
      }

      // Profile not created yet — keep Supabase session so AuthScreen can onboard → home.
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

      // Dead token only — never sign out on network / missing-profile errors.
      if (!meResult.success && isInvalidSession(meResult.error) && !authInProgressRef.current) {
        await supabase.auth.signOut();
        if (mounted) {
          const inviteContext = inviteToken ? await loadInviteContext(inviteToken) : null;
          setState({
            kind: 'auth',
            inviteToken: inviteContext?.token,
            invitePreview: inviteContext?.preview ?? undefined,
          });
        }
        return;
      }

  // Network / transient: stay on auth without destroying the session.
  if (mounted) {
    const inviteContext = inviteToken ? await loadInviteContext(inviteToken) : null;
    setState({
      kind: 'auth',
      inviteToken: inviteContext?.token,
      invitePreview: inviteContext?.preview ?? undefined,
      needsProfile: true,
    });
  }
}

    async function bootstrap() {
      try {
        const initialUrl = await Linking.getInitialURL();
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
              });
            }
            return;
          }

          if (mounted) setState({ kind: 'auth' });
          return;
        }

        await restoreSession(session.access_token, inviteToken);
      } catch {
        if (mounted) setState({ kind: 'auth' });
      }
    }

    void bootstrap();

    const urlSubscription = Linking.addEventListener('url', (event: { url: string }) => {
      const token = parseInviteToken(event.url);
      if (!token) return;
      setPendingInviteToken(token);

      void (async () => {
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
            });
          }
          return;
        }

        await restoreSession(session.access_token, token);
      })();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        if (authInProgressRef.current) return;
        setState({ kind: 'auth' });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // AuthScreen owns the signup/login → onboard → home path while in progress.
        if (authInProgressRef.current) return;
        await restoreSession(session.access_token, pendingInviteToken);
      }
    });

    return () => {
      mounted = false;
      urlSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, [pendingInviteToken]);

  if (state.kind === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.secondary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (state.kind === 'auth') {
    return (
      <>
        <AuthScreen
          inviteToken={state.inviteToken}
          invitePreview={state.invitePreview}
          initialMode={state.needsProfile ? 'complete' : undefined}
          onAuthBusyChange={(busy) => {
            authInProgressRef.current = busy;
          }}
          onAuthenticated={(role, parcelId) => {
            authInProgressRef.current = false;
            setState({ kind: 'home', role, initialParcelId: parcelId });
          }}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        linking={{
          prefixes: ['eveider://', 'http://localhost:3000', 'http://localhost:19006'],
          config: {
            screens: {
              Colis: 'invite/:token',
            },
          },
        }}
      >
        <MobileTabs role={state.role} initialParcelId={state.initialParcelId} />
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
