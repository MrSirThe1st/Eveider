'use client';

import { colors, radius } from '@eveider/config-ui';
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

  const deepLink = `eveider://invite/${token}`;

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={{ fontWeight: 500 }}>Chargement de votre invitation…</p>
      </main>
    );
  }

  if (error || !invite) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>Invitation invalide</h1>
          <p style={{ margin: 0, fontWeight: 500 }}>{error ?? 'Lien expiré ou déjà utilisé.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
          COLIS EVEIDER
        </p>
        <h1 style={titleStyle}>{invite.business} vous a envoyé un colis</h1>
        <p style={{ margin: '0 0 1.5rem', fontWeight: 500, opacity: 0.85 }}>
          Référence {invite.parcel.reference}
          {invite.parcel.locker ? ` · Casier ${invite.parcel.locker}` : ''}
        </p>

        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>
          Téléchargez l&apos;application Eveider et créez votre compte avec le numéro{' '}
          <strong>{invite.recipientPhone}</strong>.
        </p>

        <a href={deepLink} style={primaryButtonStyle}>
          OUVRIR DANS L&apos;APP
        </a>

        <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', opacity: 0.65, wordBreak: 'break-all' }}>
          {deepLink}
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
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.card,
  padding: '2rem',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 1rem',
  fontSize: '1.5rem',
  fontWeight: 700,
  letterSpacing: '0.02em',
  color: colors.secondary,
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  padding: '0.875rem 1.25rem',
  background: colors.primary,
  color: colors.secondary,
  borderRadius: radius.button,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textDecoration: 'none',
};
