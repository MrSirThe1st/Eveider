'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const LOGOUT_AFTER_FAILURES = 2;

const PUBLIC_PATHS = ['/', '/connexion', '/inscription', '/suivi', '/invite'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function pingServerSession(): Promise<'ok' | 'missing' | 'transient'> {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (response.ok) return 'ok';
    if (response.status === 401) return 'missing';
    return 'transient';
  } catch {
    return 'transient';
  }
}

async function refreshClientSession(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return false;

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs - Date.now() > EXPIRY_BUFFER_MS) {
    return true;
  }

  const { data, error } = await supabase.auth.refreshSession();
  return !error && !!data.session;
}

export function SessionKeeper() {
  const router = useRouter();
  const failureCountRef = useRef(0);
  const syncingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const maybeLogout = () => {
      if (isPublicPath(window.location.pathname)) return;
      if (failureCountRef.current >= LOGOUT_AFTER_FAILURES) {
        router.replace('/connexion');
      }
    };

    const syncSession = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        const hasClientSession = await refreshClientSession(supabase);

        if (!hasClientSession) {
          failureCountRef.current += 1;
          maybeLogout();
          return;
        }

        const serverStatus = await pingServerSession();

        if (serverStatus === 'missing') {
          // Client still has tokens but server cookies may be stale — refresh once more.
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            failureCountRef.current += 1;
            maybeLogout();
            return;
          }

          const retry = await pingServerSession();
          if (retry === 'missing') {
            failureCountRef.current += 1;
            maybeLogout();
            return;
          }
        }

        // Transient server/network errors must not log the user out.
        failureCountRef.current = 0;
      } finally {
        syncingRef.current = false;
      }
    };

    void syncSession();

    const interval = window.setInterval(() => {
      void syncSession();
    }, REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncSession();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            failureCountRef.current = LOGOUT_AFTER_FAILURES;
            maybeLogout();
          }
        });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        failureCountRef.current = 0;
      }
    });

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
