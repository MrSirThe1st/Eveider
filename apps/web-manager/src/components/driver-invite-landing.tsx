'use client';

import { colors, radius, shadows, spacing, webCardStyle } from '@eveider/config-ui';
import { LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Preview = {
  email: string;
  fullName: string;
};

type DriverInviteLandingProps = {
  token?: string;
};

export function DriverInviteLanding({ token }: DriverInviteLandingProps) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Lien invalide ou expiré. Demandez un nouveau lien à Eveider.');
      setLoading(false);
      return;
    }

    void fetch(`/api/driver-invite/${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          setError(result.error ?? 'Invitation invalide');
          return;
        }
        setPreview(result.data.invite);
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <LoadingSpinner label="Chargement de l’invitation…" />
      </main>
    );
  }

  if (error || !preview) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>Invitation invalide</h1>
          <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>
            {error ?? 'Lien expiré ou déjà utilisé.'}
          </p>
          <Link href="/connexion" style={primaryButtonStyle}>
            Se connecter
          </Link>
        </section>
      </main>
    );
  }

  const signupHref = `/inscription?driverInvite=${encodeURIComponent(token!)}`;
  const loginHref = `/connexion?driverInvite=${encodeURIComponent(token!)}`;

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={titleStyle}>Accès chauffeur</h1>
        <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>
          {preview.fullName ? (
            <>
              {preview.fullName}, vous êtes invité(e) à rejoindre Eveider avec l’adresse{' '}
              {preview.email}.
            </>
          ) : (
            <>Vous êtes invité(e) à rejoindre Eveider avec l’adresse {preview.email}.</>
          )}{' '}
          Créez votre compte et choisissez un mot de passe pour vous connecter ensuite.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <Link href={signupHref} style={primaryButtonStyle}>
            Créer mon compte
          </Link>
          <Link href={loginHref} style={secondaryButtonStyle}>
            J’ai déjà un compte
          </Link>
        </div>
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

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: '#FFFFFF',
  color: colors.secondary,
  border: `1px solid ${colors.border}`,
};
