'use client';

import { colors, radius } from '@eveider/config-ui';
import { useEffect, useState } from 'react';

type InviteInfo = {
  status: 'pending' | 'accepted' | 'expired';
  deepLink: string;
  webLink: string;
  expiresAt: string;
  acceptedAt: string | null;
};

type ParcelInvitePanelProps = {
  parcelId: string;
  initialInvite?: InviteInfo | null;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const STATUS_LABELS: Record<InviteInfo['status'], string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  expired: 'Expirée',
};

export function ParcelInvitePanel({ parcelId, initialInvite }: ParcelInvitePanelProps) {
  const [invite, setInvite] = useState<InviteInfo | null>(initialInvite ?? null);
  const [loading, setLoading] = useState(!initialInvite);
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialInvite) return;

    void fetch(`/api/entreprise/parcels/${parcelId}/invite`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setInvite(result.data.invite);
        }
      })
      .finally(() => setLoading(false));
  }, [parcelId, initialInvite]);

  async function handleResend() {
    setResending(true);
    setError(null);

    try {
      const response = await fetch(`/api/entreprise/parcels/${parcelId}/invite/resend`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Renvoi impossible');
        return;
      }

      setInvite(result.data.invite);
    } catch {
      setError('Erreur réseau');
    } finally {
      setResending(false);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Copie impossible');
    }
  }

  if (loading) {
    return (
      <section
        style={{
          marginTop: '1.25rem',
          background: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radius.card,
          padding: '1.5rem',
        }}
      >
        <p style={{ margin: 0, fontWeight: 500 }}>Chargement de l&apos;invitation…</p>
      </section>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <section
      style={{
        marginTop: '1.25rem',
        background: colors.surface,
        border: `2px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: '1.5rem',
      }}
    >
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
        INVITATION DESTINATAIRE
      </p>
      <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', opacity: 0.75 }}>
        Le destinataire n&apos;a pas encore de compte Eveider. Une invitation WhatsApp est envoyée
        automatiquement à la création du colis ; vous pouvez aussi partager le lien ci-dessous.
      </p>

      <p style={{ margin: '0 0 1rem', fontWeight: 600 }}>
        Statut : {STATUS_LABELS[invite.status]}
        {invite.status === 'pending' ? ` · expire le ${formatDateTime(invite.expiresAt)}` : null}
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.6875rem', fontWeight: 600 }}>LIEN WEB</p>
          <code
            style={{
              display: 'block',
              padding: '0.75rem',
              background: colors.background,
              borderRadius: radius.button,
              fontSize: '0.8125rem',
              wordBreak: 'break-all',
            }}
          >
            {invite.webLink}
          </code>
          <button
            type="button"
            onClick={() => void copyText('web', invite.webLink)}
            style={{
              marginTop: '0.5rem',
              height: 36,
              padding: '0 1rem',
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              background: colors.surface,
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {copied === 'web' ? 'COPIÉ' : 'COPIER LE LIEN WEB'}
          </button>
        </div>

        <div>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.6875rem', fontWeight: 600 }}>DEEP LINK APP</p>
          <code
            style={{
              display: 'block',
              padding: '0.75rem',
              background: colors.background,
              borderRadius: radius.button,
              fontSize: '0.8125rem',
              wordBreak: 'break-all',
            }}
          >
            {invite.deepLink}
          </code>
          <button
            type="button"
            onClick={() => void copyText('deep', invite.deepLink)}
            style={{
              marginTop: '0.5rem',
              height: 36,
              padding: '0 1rem',
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              background: colors.surface,
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {copied === 'deep' ? 'COPIÉ' : 'COPIER LE DEEP LINK'}
          </button>
        </div>
      </div>

      {error ? (
        <p style={{ margin: '1rem 0 0', color: colors.danger, fontWeight: 500, fontSize: '0.8125rem' }}>
          {error}
        </p>
      ) : null}

      {invite.status === 'pending' || invite.status === 'expired' ? (
        <button
          type="button"
          disabled={resending}
          onClick={() => void handleResend()}
          style={{
            marginTop: '1.25rem',
            height: 40,
            padding: '0 1.25rem',
            border: `2px solid ${colors.border}`,
            borderRadius: radius.button,
            background: 'transparent',
            color: colors.secondary,
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: resending ? 'wait' : 'pointer',
            opacity: resending ? 0.7 : 1,
          }}
        >
          {resending ? 'ENVOI…' : 'RENVOYER L\'INVITATION'}
        </button>
      ) : null}
    </section>
  );
}
