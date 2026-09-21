'use client';

import { colors, radius, shadows, spacing, webCardStyle } from '@eveider/config-ui';
import { LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type DriverInviteLandingProps = {
  token?: string;
};

export function DriverInviteLanding({ token }: DriverInviteLandingProps) {
  const [fullName, setFullName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      try {
        const supabase = createClient();
        if (token) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink',
          });
          if (otpError) {
            throw new Error(otpError.message);
          }
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('Lien invalide ou expiré. Demandez un nouveau lien à Eveider.');
          }
        }

        const response = await fetch('/api/driver-invite/complete', { method: 'POST' });
        const result = (await response.json()) as {
          success: boolean;
          error?: string;
          data?: { fullName: string | null };
        };
        if (!result.success) {
          throw new Error(result.error ?? 'Impossible d’activer le compte');
        }
        if (!cancelled) setFullName(result.data?.fullName ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible d’activer le compte');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void activate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <LoadingSpinner label="Activation de votre accès chauffeur…" />
      </main>
    );
  }

  if (error) {
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
};
