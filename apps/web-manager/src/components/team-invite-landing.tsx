'use client';

import { colors, radius, shadows, spacing, webCardStyle } from '@eveider/config-ui';
import { BUSINESS_USER_ROLE_LABELS, type BusinessUserRole } from '@eveider/domain';
import { LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Preview = {
  businessName: string;
  email: string;
  invitedRole: BusinessUserRole;
};

type TeamInviteLandingProps = {
  token: string;
};

export function TeamInviteLanding({ token }: TeamInviteLandingProps) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/team-invite/${token}`)
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

  const signupHref = `/inscription?invite=${encodeURIComponent(token)}`;

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={titleStyle}>Rejoindre {preview.businessName}</h1>
        <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>
          Vous êtes invité(e) en tant que {BUSINESS_USER_ROLE_LABELS[preview.invitedRole]} avec
          l’adresse {preview.email}.
        </p>
        <Link href={signupHref} style={primaryButtonStyle}>
          Créer mon compte
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
