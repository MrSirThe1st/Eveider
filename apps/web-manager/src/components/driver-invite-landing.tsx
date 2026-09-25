'use client';

import { colors, radius, shadows, spacing, webCardStyle } from '@eveider/config-ui';
import { LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type DriverInviteLandingProps = {
  token?: string;
};

type Phase = 'prompt' | 'loading' | 'done' | 'error';

/**
 * Supabase deprecated `magiclink` / `signup` for verifyOtp — use `email`.
 * Keep a magiclink fallback for older Auth rows still tagged that way.
 */
async function verifyMagicLinkToken(token: string) {
  const supabase = createClient();
  const primary = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'email',
  });
  if (!primary.error) return primary;

  const fallback = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink',
  });
  return fallback.error ? primary : fallback;
}

async function completeDriverInvite(): Promise<string | null> {
  const response = await fetch('/api/driver-invite/complete', { method: 'POST' });
  const result = (await response.json()) as {
    success: boolean;
    error?: string;
    data?: { fullName: string | null };
  };
  if (!result.success) {
    throw new Error(result.error ?? 'Impossible d’activer le compte');
  }
  return result.data?.fullName ?? null;
}

export function DriverInviteLanding({ token }: DriverInviteLandingProps) {
  const [phase, setPhase] = useState<Phase>(token ? 'prompt' : 'loading');
  const [fullName, setFullName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) return;

    let cancelled = false;

    async function activateFromSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Lien invalide ou expiré. Demandez un nouveau lien à Eveider.');
        }
        const name = await completeDriverInvite();
        if (!cancelled) {
          setFullName(name);
          setPhase('done');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible d’activer le compte');
          setPhase('error');
        }
      }
    }

    void activateFromSession();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function activateWithToken() {
    if (!token || phase === 'loading') return;
    setPhase('loading');
    setError(null);
    try {
      const { error: otpError } = await verifyMagicLinkToken(token);
      if (otpError) {
        throw new Error(otpError.message);
      }
      const name = await completeDriverInvite();
      setFullName(name);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’activer le compte');
      setPhase('error');
    }
  }

  if (phase === 'loading') {
    return (
      <main style={pageStyle}>
        <LoadingSpinner label="Activation de votre accès chauffeur…" />
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>Lien invalide</h1>
          <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>{error}</p>
          <Link href="/connexion" style={primaryButtonStyle}>
            Se connecter
          </Link>
        </section>
      </main>
    );
  }

  if (phase === 'prompt') {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>Activer votre accès</h1>
          <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>
            Cliquez pour activer votre compte chauffeur Eveider. Aucun mot de passe à créer.
          </p>
          <button type="button" onClick={() => void activateWithToken()} style={primaryButtonStyle}>
            Activer mon accès
          </button>
        </section>
      </main>
    );
  }

  const greeting = fullName ? `Bonjour ${fullName}.` : 'Bonjour.';

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={titleStyle}>Accès chauffeur activé</h1>
        <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>
          {greeting} Votre compte est actif. Les livraisons se feront dans l’application Eveider.
          Elle n’est pas encore partout en téléchargement, donc cet accès web suffit pour
          l’instant.
        </p>
        <Link href="/chauffeur" style={primaryButtonStyle}>
          Voir mon accès
        </Link>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: colors.background,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  ...webCardStyle,
  padding: '2rem',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 1rem',
  fontSize: '1.5rem',
  fontWeight: 800,
  color: colors.secondary,
  lineHeight: 1.25,
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'center',
  height: spacing.buttonHeight,
  lineHeight: `${spacing.buttonHeight}px`,
  padding: '0 1.25rem',
  background: colors.primary,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: radius.button,
  fontWeight: 700,
  textDecoration: 'none',
  boxShadow: shadows.none,
  cursor: 'pointer',
  font: 'inherit',
};
