'use client';

import { colors, radius, shadows, spacing, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type InvitePreview = {
  business: string;
  recipientPhone: string;
  recipientName: string | null;
  parcel: {
    id: string;
    reference: string;
    locker: string | null;
  };
};

type InviteLandingProps = {
  token: string;
};

export function InviteLanding({ token }: InviteLandingProps) {
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/invite/${token}`)
      .then((res) => res.json())
      .then((result) => {
        if (!result.success) {
          setError(result.error ?? 'Invitation invalide');
          return;
        }
        setInvite(result.data.invite);
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Chargement de votre colis…
        </p>
      </main>
    );
  }

  if (error || !invite) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>LIEN INVALIDE</h1>
          <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>
            {error ?? 'Lien expiré ou déjà utilisé.'}
          </p>
          <Link href="/suivi" style={primaryButtonStyle}>
            SUIVRE UN COLIS
          </Link>
        </section>
      </main>
    );
  }

  const trackHref = `/suivi?ref=${encodeURIComponent(invite.parcel.reference)}&phone=${encodeURIComponent(invite.recipientPhone)}`;

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: colors.textMuted,
          }}
        >
          COLIS EVEIDER
        </p>
        <h1 style={titleStyle}>
          {invite.business.toUpperCase()} VOUS A ENVOYÉ UN COLIS
        </h1>
        <p style={{ margin: '0 0 1.5rem', fontWeight: 500, color: colors.textMuted }}>
          Référence {invite.parcel.reference}
          {invite.parcel.locker ? ` · Casier ${invite.parcel.locker}` : ''}
        </p>

        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.5 }}>
          Suivez votre colis, payez le retrait et révélez votre code PIN — <strong>sans créer de compte</strong>.
          Utilisez le numéro <strong>{invite.recipientPhone}</strong>.
        </p>

        <a href={trackHref} style={primaryButtonStyle}>
          SUIVRE MON COLIS SUR LE WEB
        </a>

        <p style={{ margin: '1.25rem 0 0', fontSize: '0.75rem', color: colors.textMuted, textAlign: 'center' }}>
          Compte app optionnel pour l&apos;historique et les notifications.
        </p>
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
