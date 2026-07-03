'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import type { ParcelStatus } from '@eveider/domain';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import {
  ParcelStatusFilters,
  type ParcelStatusFilter,
} from '@/components/parcel-status-filters';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';

type ParcelItem = {
  id: string;
  reference: string;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  locker: { name: string; address: string } | null;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function ParcelList() {
  const [statusFilter, setStatusFilter] = useState<ParcelStatusFilter>('all');
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParcels = useCallback(async (filter: ParcelStatusFilter) => {
    setLoading(true);
    setError(null);

    const query = filter === 'all' ? '' : `?status=${filter}`;

    try {
      const response = await fetch(`/api/parcels${query}`, { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Chargement échoué');
        setParcels([]);
        return;
      }

      setParcels(result.data.parcels);
    } catch {
      setError('Impossible de charger les colis. Vérifiez la connexion au serveur.');
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadParcels(statusFilter);
  }, [loadParcels, statusFilter]);

  useEffect(() => {
    function onFocus() {
      void loadParcels(statusFilter);
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadParcels, statusFilter]);

  return (
    <div>
      <ParcelStatusFilters value={statusFilter} onChange={setStatusFilter} />

      {loading ? <p style={{ fontWeight: 500 }}>Chargement des colis…</p> : null}

      {!loading && error ? (
        <div>
          <FlashBanner message={error} variant="error" />
          <button
            type="button"
            onClick={() => void loadParcels(statusFilter)}
            style={{
              height: spacing.buttonHeight,
              padding: '0 1.5rem',
              background: colors.primary,
              color: colors.secondary,
              border: 'none',
              borderRadius: radius.button,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            RÉESSAYER
          </button>
        </div>
      ) : null}

      {!loading && !error && parcels.length === 0 ? (
        <section
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.card,
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, letterSpacing: '0.04em' }}>
            {statusFilter === 'all' ? 'AUCUN COLIS' : 'AUCUN COLIS POUR CE FILTRE'}
          </p>
          <p style={{ margin: '0.75rem 0 0', fontWeight: 500 }}>
            {statusFilter === 'all'
              ? 'Créez votre premier envoi pour le réseau de casiers Eveider.'
              : 'Essayez un autre filtre ou créez un nouveau colis.'}
          </p>
          <Link
            href="/tableau-de-bord/colis/nouveau"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: colors.secondary,
            }}
          >
            CRÉER UN COLIS →
          </Link>
        </section>
      ) : null}

      {!loading && !error && parcels.length > 0 ? (
        <>
          <p
            style={{
              margin: '0 0 1rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.06em',
            }}
          >
            {parcels.length} COLIS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {parcels.map((parcel) => (
              <Link
                key={parcel.id}
                href={`/tableau-de-bord/colis/${parcel.id}`}
                style={{
                  display: 'block',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.card,
                  padding: '1.25rem 1.5rem',
                  textDecoration: 'none',
                  color: colors.secondary,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.04em' }}>
                      {parcel.reference}
                    </p>
                    <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
                      {parcel.recipientName ?? 'Destinataire'} · {parcel.recipientPhone}
                    </p>
                    <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.8125rem' }}>
                      {parcel.locker ? `${parcel.locker.name}` : 'Casier non assigné'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <ParcelStatusBadge status={parcel.status} />
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', fontWeight: 500 }}>
                      {formatDate(parcel.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
