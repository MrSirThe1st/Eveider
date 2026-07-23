'use client';

import { colors, radius, spacing, borderSubtle, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { FilterBar, FilterChipGroup, LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import {
  DELIVERIES_REFRESH_MS,
  type DeliveryFilters,
  type DeliveryItem,
  type DeliveryStatusFilter,
  useDeliveriesBoardQuery,
} from '@/hooks/queries/use-deliveries-query';

const STATUS_FILTERS: { value: DeliveryStatusFilter; label: string }[] = [
  { value: 'all', label: 'ACTIVES' },
  { value: 'assigned', label: DELIVERY_STATUS_LABELS.assigned },
  { value: 'scanned', label: DELIVERY_STATUS_LABELS.scanned },
  { value: 'drop_off_pending', label: DELIVERY_STATUS_LABELS.drop_off_pending },
];

const selectStyle: React.CSSProperties = {
  ...webInputStyle,
  minWidth: 180,
  height: spacing.buttonHeight,
  padding: '0 0.75rem',
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function courierLabel(courier: DeliveryItem['courier']) {
  return courier.fullName ?? courier.email ?? courier.phone ?? 'Coursier';
}

export function AdminLiveDeliveryBoard() {
  const [filters, setFilters] = useState<DeliveryFilters>({
    status: 'all',
    courierId: '',
    lockerId: '',
    businessId: '',
  });

  const boardQuery = useDeliveriesBoardQuery(filters);

  const deliveries = boardQuery.data?.deliveries ?? [];
  const summary = boardQuery.data?.summary ?? null;

  const couriers = useMemo(
    () =>
      (boardQuery.data?.couriers ?? []).map((c) => ({
        id: c.id,
        label: c.fullName ?? c.email ?? c.id,
      })),
    [boardQuery.data?.couriers],
  );

  const lockers = useMemo(
    () =>
      (boardQuery.data?.lockers ?? []).map((l) => ({
        id: l.id,
        label: l.name,
      })),
    [boardQuery.data?.lockers],
  );

  const businesses = useMemo(
    () =>
      (boardQuery.data?.businesses ?? []).map((b) => ({
        id: b.id,
        label: b.name,
      })),
    [boardQuery.data?.businesses],
  );

  const showInitialLoader = boardQuery.isLoading && deliveries.length === 0;
  const showFatalError = boardQuery.isError && deliveries.length === 0;
  const showRefreshError = boardQuery.isError && deliveries.length > 0;
  const errorMessage =
    boardQuery.error instanceof Error
      ? boardQuery.error.message
      : 'Impossible de charger les livraisons.';

  const lastRefresh = boardQuery.dataUpdatedAt
    ? new Date(boardQuery.dataUpdatedAt)
    : null;

  const summaryCards = useMemo(
    () => [
      { key: 'assigned' as const, label: DELIVERY_STATUS_LABELS.assigned, value: summary?.assigned ?? 0 },
      { key: 'scanned' as const, label: DELIVERY_STATUS_LABELS.scanned, value: summary?.scanned ?? 0 },
      {
        key: 'drop_off_pending' as const,
        label: DELIVERY_STATUS_LABELS.drop_off_pending,
        value: summary?.drop_off_pending ?? 0,
      },
    ],
    [summary],
  );

  function updateFilter<K extends keyof DeliveryFilters>(key: K, value: DeliveryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => updateFilter('status', filters.status === card.key ? 'all' : card.key)}
            style={{
              textAlign: 'left',
              padding: '1rem 1.25rem',
              background: filters.status === card.key ? '#E8FCE8' : colors.surface,
              border: `1px solid ${filters.status === card.key ? colors.primary : colors.border}`,
              borderRadius: radius.card,
              cursor: 'pointer',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              {card.label}
            </p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>{card.value}</p>
          </button>
        ))}
        <div
          style={{
            ...webCardStyle,
            padding: '1rem 1.25rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600 }}>
            Total actif
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>{summary?.total ?? 0}</p>
        </div>
      </div>

      <FilterBar label="FILTRER PAR STATUT">
        <FilterChipGroup
          items={STATUS_FILTERS}
          value={filters.status}
          onChange={(value) => updateFilter('status', value)}
        />
      </FilterBar>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
        }}
      >
        <select
          value={filters.courierId}
          onChange={(event) => updateFilter('courierId', event.target.value)}
          style={selectStyle}
          aria-label="Filtrer par coursier"
        >
          <option value="">Tous les coursiers</option>
          {couriers.map((courier) => (
            <option key={courier.id} value={courier.id}>
              {courier.label}
            </option>
          ))}
        </select>

        <select
          value={filters.lockerId}
          onChange={(event) => updateFilter('lockerId', event.target.value)}
          style={selectStyle}
          aria-label="Filtrer par casier"
        >
          <option value="">Tous les casiers</option>
          {lockers.map((locker) => (
            <option key={locker.id} value={locker.id}>
              {locker.label}
            </option>
          ))}
        </select>

        <select
          value={filters.businessId}
          onChange={(event) => updateFilter('businessId', event.target.value)}
          style={selectStyle}
          aria-label="Filtrer par entreprise"
        >
          <option value="">Toutes les entreprises</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.label}
            </option>
          ))}
        </select>

        {boardQuery.isFetching && deliveries.length > 0 ? (
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: colors.secondary, opacity: 0.7 }}>
            Mise à jour…
          </span>
        ) : null}

        {lastRefresh ? (
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: colors.secondary, opacity: 0.7 }}>
            Actualisé à {formatDateTime(lastRefresh.toISOString())} · auto {DELIVERIES_REFRESH_MS / 1000}s
          </span>
        ) : null}
      </div>

      {showInitialLoader ? <LoadingSpinner label="Chargement des livraisons…" /> : null}

      {showFatalError ? (
        <div>
          <FlashBanner message={errorMessage} variant="error" />
          <button
            type="button"
            onClick={() => void boardQuery.refetch()}
            style={{
              ...webSecondaryButtonStyle,
              marginTop: '1rem',
              height: spacing.buttonHeight,
              padding: '0 1.25rem',
              background: colors.surface,
            }}
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {showRefreshError ? (
        <FlashBanner message={`${errorMessage} Les données affichées peuvent être obsolètes.`} variant="error" />
      ) : null}

      {!showInitialLoader && !showFatalError && deliveries.length === 0 ? (
        <p style={{ fontWeight: 500, color: colors.secondary, opacity: 0.8 }}>
          Aucune livraison active pour ces filtres.
        </p>
      ) : null}

      {!showInitialLoader && !showFatalError && deliveries.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
            <thead>
              <tr>
                {['COLIS', 'STATUT', 'COURSIER', 'ENTREPRISE', 'CASIER', 'DESTINATAIRE', 'MAJ', ''].map(
                  (heading) => (
                    <th
                      key={heading || 'actions'}
                      style={{
                        textAlign: 'left',
                        padding: '0.75rem',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        borderBottom: borderSubtle(),
                      }}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    <Link
                      href={`/tableau-de-bord/colis/${delivery.parcel.id}`}
                      style={{ fontWeight: 700, color: colors.secondary, textDecoration: 'none' }}
                    >
                      {delivery.parcel.trackingNumber}
                    </Link>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    <DeliveryStatusBadge status={delivery.status} />
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    <Link
                      href={`/tableau-de-bord/utilisateurs/${delivery.courier.id}`}
                      style={{ fontWeight: 500, color: colors.secondary, textDecoration: 'none' }}
                    >
                      {courierLabel(delivery.courier)}
                    </Link>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle(), fontWeight: 500 }}>
                    {delivery.parcel.business.name}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle(), fontWeight: 500 }}>
                    {delivery.parcel.locker ? (
                      <Link
                        href={`/tableau-de-bord/points/${delivery.parcel.locker.id}`}
                        style={{ color: colors.secondary, textDecoration: 'none' }}
                      >
                        {delivery.parcel.locker.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle(), fontWeight: 500 }}>
                    {delivery.parcel.recipientName ?? '—'}
                    <br />
                    <span style={{ fontSize: '0.8125rem', opacity: 0.75 }}>{delivery.parcel.recipientPhone}</span>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle(), fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {formatDateTime(delivery.updatedAt)}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    <Link
                      href={`/tableau-de-bord/colis/${delivery.parcel.id}`}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: colors.secondary,
                      }}
                    >
                      DÉTAIL →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
