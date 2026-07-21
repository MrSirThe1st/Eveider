'use client';

import { colors, spacing, webCardStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import {
  ParcelStatusFilters,
  type ParcelStatusFilter,
} from '@/components/parcel-status-filters';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import { useBusinessParcelsQuery } from '@/hooks/queries/use-parcels-query';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function ParcelList() {
  const [statusFilter, setStatusFilter] = useState<ParcelStatusFilter>('all');
  const { data: parcels = [], isLoading, isFetching, isError, error, refetch } =
    useBusinessParcelsQuery(statusFilter);

  const showInitialLoader = isLoading && parcels.length === 0;
  const showFatalError = isError && parcels.length === 0;
  const showRefreshError = isError && parcels.length > 0;
  const errorMessage =
    error instanceof Error ? error.message : 'Impossible de charger les colis. Vérifiez la connexion au serveur.';

  return (
    <div>
      <ParcelStatusFilters value={statusFilter} onChange={setStatusFilter} />

      {isFetching && parcels.length > 0 ? (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 500, opacity: 0.7 }}>
          Mise à jour…
        </p>
      ) : null}

      {showInitialLoader ? <LoadingSpinner label="Chargement des colis…" /> : null}

      {showFatalError ? (
        <div>
          <FlashBanner message={errorMessage} variant="error" />
          <button
            type="button"
            onClick={() => void refetch()}
            style={{
              ...webSecondaryButtonStyle,
              height: spacing.buttonHeight,
              padding: '0 1.5rem',
              fontSize: '0.9375rem',
            }}
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {showRefreshError ? (
        <FlashBanner message={`${errorMessage} Les données affichées peuvent être obsolètes.`} variant="error" />
      ) : null}

      {!showInitialLoader && !showFatalError && parcels.length === 0 ? (
        <section
          style={{
            ...webCardStyle,
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            {statusFilter === 'all' ? 'Aucun colis' : 'Aucun colis pour ce filtre'}
          </p>
          <p style={{ margin: '0.75rem 0 0', fontWeight: 500 }}>
            {statusFilter === 'all'
              ? 'Créez votre premier envoi pour le réseau de casiers Eveider.'
              : 'Essayez un autre filtre ou créez un nouveau colis.'}
          </p>
          <Link
            href="/entreprise/tableau-de-bord/colis/nouveau"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: colors.secondary,
            }}
          >
            Créer un colis →
          </Link>
        </section>
      ) : null}

      {!showInitialLoader && !showFatalError && parcels.length > 0 ? (
        <>
          <p
            style={{
              margin: '0 0 1rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.06em',
            }}
          >
            {parcels.length} colis
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {parcels.map((parcel) => (
              <Link
                key={parcel.id}
                href={`/entreprise/tableau-de-bord/colis/${parcel.id}`}
                style={{
                  ...webCardStyle,
                  display: 'block',
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
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9375rem' }}>
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
