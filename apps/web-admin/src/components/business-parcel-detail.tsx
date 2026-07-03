'use client';

import { colors, radius } from '@eveider/config-ui';
import type { ParcelStatus } from '@eveider/domain';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { ParcelInvitePanel } from '@/components/parcel-invite-panel';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';

type ParcelDetailData = {
  id: string;
  reference: string;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  lockerId: string | null;
  locker: { id: string; name: string; address: string } | null;
  compartment: { id: string; label: string; sizeLabel: string } | null;
  createdAt: string;
  updatedAt: string;
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

type ParcelDetailProps = {
  parcelId: string;
};

export function BusinessParcelDetail({ parcelId }: ParcelDetailProps) {
  const searchParams = useSearchParams();
  const justCreated = searchParams.get('created') === '1';
  const [parcel, setParcel] = useState<ParcelDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/entreprise/parcels/${parcelId}`)
      .then((res) => res.json())
      .then((result) => {
        if (!result.success) {
          setError(result.error ?? 'Colis introuvable');
          return;
        }
        setParcel(result.data.parcel);
      })
      .finally(() => setLoading(false));
  }, [parcelId]);

  if (loading) {
    return <p style={{ fontWeight: 500 }}>Chargement…</p>;
  }

  if (error || !parcel) {
    return (
      <div>
        <p style={{ fontWeight: 500, color: colors.danger }}>{error ?? 'Colis introuvable'}</p>
        <Link href={WEB_ROUTES.businessDashboard} style={{ fontWeight: 600 }}>
          ← Retour aux colis
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {justCreated ? (
        <FlashBanner message={`Colis ${parcel.reference} créé avec succès.`} />
      ) : null}
      <Link
        href={WEB_ROUTES.businessDashboard}
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
        ← RETOUR AUX COLIS
      </Link>

      <section
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.card,
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            {parcel.reference}
          </h2>
          <ParcelStatusBadge status={parcel.status} />
        </div>

        <dl style={{ margin: '2rem 0 0', display: 'grid', gap: '1.25rem' }}>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>DESTINATAIRE</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.recipientName ?? '—'} · {parcel.recipientPhone}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              CASIER DE DESTINATION
            </dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.locker ? (
                <>
                  {parcel.locker.name}
                  <br />
                  <span style={{ fontSize: '0.875rem' }}>{parcel.locker.address}</span>
                </>
              ) : (
                'Non assigné'
              )}
            </dd>
          </div>
          {parcel.compartment ? (
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
                COMPARTIMENT RÉSERVÉ
              </dt>
              <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
                {parcel.compartment.label} — {parcel.compartment.sizeLabel}
              </dd>
            </div>
          ) : null}
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>CRÉÉ LE</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{formatDateTime(parcel.createdAt)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              DERNIÈRE MISE À JOUR
            </dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{formatDateTime(parcel.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <ParcelInvitePanel parcelId={parcelId} />
    </div>
  );
}
