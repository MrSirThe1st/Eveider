'use client';

import { colors, radius, spacing, borderSubtle, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';

const DELIVERY_STATUS_LABELS = {
  assigned: 'Assigné',
  scanned: 'Scanné (En route)',
  drop_off_pending: 'Arrivé au casier',
  completed: 'Livré',
  failed: 'Échec',
} as const;

const DELIVERY_STATUS_COLORS = {
  assigned: colors.info,
  scanned: colors.warning,
  drop_off_pending: colors.warning,
  completed: colors.success,
  failed: colors.danger,
} as const;

type CourierProfile = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isBlocked: boolean;
  createdAt: string;
};

type DeliveryStats = {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
};

type DeliveryItem = {
  id: string;
  status: keyof typeof DELIVERY_STATUS_LABELS;
  createdAt: string;
  completedAt: string | null;
  parcel: {
    id: string;
    reference: string;
    businessName: string;
    locker: {
      name: string;
      address: string;
    } | null;
  };
};

type CourierDetailProps = {
  courierId: string;
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

function StatCard({ label, value, color = colors.secondary }: { label: string; value: number; color?: string }) {
  return (
    <div
      style={{
        ...webCardStyle,
        padding: '1.25rem',
        flex: '1 1 180px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.7 }}>
        {label}
      </span>
      <span style={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

export function CourierProfileDetail({ courierId }: CourierDetailProps) {
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/couriers/${courierId}`, { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Coursier introuvable');
      } else {
        setProfile(result.data.courier);
        setStats(result.data.stats);
        setDeliveries(result.data.deliveries);
      }
    } catch {
      setError('Erreur lors de la récupération des données du coursier');
    } finally {
      setLoading(false);
    }
  }, [courierId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleToggleStatus() {
    if (!profile) return;
    setActing(true);
    setActionError(null);
    setSuccessMessage(null);

    const nextState = !profile.isBlocked;

    try {
      const response = await fetch(`/api/users/${profile.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: nextState }),
      });
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Impossible de modifier le statut');
      } else {
        setProfile((prev) => (prev ? { ...prev, isBlocked: nextState } : null));
        setSuccessMessage(`Coursier ${nextState ? 'bloqué' : 'activé'} avec succès`);
      }
    } catch {
      setActionError('Erreur de communication avec le serveur');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <p style={{ fontWeight: 500 }}>Chargement du profil coursier…</p>;
  }

  if (error || !profile) {
    return (
      <div>
        <p style={{ color: colors.danger, fontWeight: 500, marginBottom: '1rem' }}>
          {error ?? 'Profil introuvable'}
        </p>
        <Link href="/tableau-de-bord/utilisateurs" style={{ fontWeight: 700, color: colors.secondary }}>
          ← RETOUR AUX UTILISATEURS
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 850 }}>
      {successMessage && <FlashBanner message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
      {actionError && <FlashBanner message={actionError} variant="error" onDismiss={() => setActionError(null)} />}

      <Link
        href="/tableau-de-bord/utilisateurs"
        style={{
          display: 'inline-block',
          marginBottom: '1.5rem',
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.04em',
          color: colors.secondary,
          textDecoration: 'none',
        }}
      >
        ← RETOUR AUX UTILISATEURS
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.04em' }}>
          {profile.fullName?.toUpperCase() ?? 'COURSIER'}
        </h2>
        <button
          type="button"
          disabled={acting}
          onClick={() => void handleToggleStatus()}
          style={{
            height: spacing.buttonHeight,
            padding: '0 1.5rem',
            border: 'none',
            borderRadius: radius.button,
            fontWeight: 700,
            fontSize: '0.8125rem',
            letterSpacing: '0.05em',
            cursor: acting ? 'wait' : 'pointer',
            backgroundColor: profile.isBlocked ? colors.primary : colors.danger,
            color: colors.secondary,
            opacity: acting ? 0.6 : 1,
          }}
        >
          {profile.isBlocked ? 'DÉBLOQUER LE COMPTE' : 'BLOQUER LE COMPTE'}
        </button>
      </div>

      {/* Profil details block */}
      <section
        style={{
          ...webCardStyle,
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
          Informations profil
        </h3>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>EMAIL</dt>
            <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{profile.email ?? '—'}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>TÉLÉPHONE</dt>
            <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{profile.phone ?? '—'}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>INSCRIT LE</dt>
            <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{formatDateTime(profile.createdAt)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>STATUT COMPTE</dt>
            <dd style={{ margin: '0.25rem 0 0' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: profile.isBlocked ? 'rgba(229, 57, 53, 0.1)' : 'rgba(9, 212, 11, 0.1)',
                  color: profile.isBlocked ? colors.danger : colors.success,
                }}
              >
                {profile.isBlocked ? 'SUSPENDU / BLOQUÉ' : 'ACTIF / AUTORISÉ'}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="LIVRAISONS TOTALES" value={stats.total} />
          <StatCard label="LIVRÉES" value={stats.completed} color={colors.success} />
          <StatCard label="ÉCHECS" value={stats.failed} color={colors.danger} />
          <StatCard label="EN COURS" value={stats.inProgress} color={colors.warning} />
        </div>
      )}

      {/* Assigned deliveries history */}
      <section
        style={{
          ...webCardStyle,
          overflow: 'hidden',
          marginBottom: '2rem',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: borderSubtle(), background: colors.background }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>
            Historique des livraisons
          </h3>
        </div>
        {deliveries.length === 0 ? (
          <p style={{ padding: '2rem', fontWeight: 500, textAlign: 'center', opacity: 0.65 }}>
            Aucune livraison enregistrée pour ce coursier.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: borderSubtle() }}>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>COLIS</th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>ENTREPRISE</th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>CASIER</th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>ASSIGNÉ LE</th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>STATUT</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id} style={{ borderBottom: borderSubtle() }}>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>
                    <Link
                      href={`/tableau-de-bord/colis/${delivery.parcel.id}`}
                      style={{ color: colors.secondary, textDecoration: 'none' }}
                    >
                      {delivery.parcel.reference}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#555555' }}>
                    {delivery.parcel.businessName}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#555555' }}>
                    {delivery.parcel.locker ? (
                      <>
                        <span style={{ fontWeight: 600, color: colors.secondary }}>{delivery.parcel.locker.name}</span>
                        <br />
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{delivery.parcel.locker.address}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#555555' }}>
                    {formatDateTime(delivery.createdAt)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: `${DELIVERY_STATUS_COLORS[delivery.status]}1A`, // opacity 10%
                        color: DELIVERY_STATUS_COLORS[delivery.status],
                      }}
                    >
                      {DELIVERY_STATUS_LABELS[delivery.status].toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
