'use client';

import { colors, radius, spacing, borderSubtle, webCardStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { FilterToolbar, LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import {
  DELIVERIES_REFRESH_MS,
  type DeliveryFilters,
  type DeliveryItem,
  type DeliveryStatusFilter,
  useDeliveriesBoardQuery,
} from '@/hooks/queries/use-deliveries-query';

const STATUS_OPTIONS: { value: DeliveryStatusFilter; label: string }[] = [
  { value: 'all', label: 'Toutes actives' },
  { value: 'assigned', label: DELIVERY_STATUS_LABELS.assigned },
  { value: 'scanned', label: DELIVERY_STATUS_LABELS.scanned },
  { value: 'drop_off_pending', label: DELIVERY_STATUS_LABELS.drop_off_pending },
];

function parseStatusParam(raw: string | null): DeliveryStatusFilter {
  if (raw === 'assigned' || raw === 'scanned' || raw === 'drop_off_pending') return raw;
  return 'all';
}

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFromUrl = parseStatusParam(searchParams.get('status'));

  const [filters, setFilters] = useState<DeliveryFilters>({
    status: statusFromUrl,
    courierId: '',
    lockerId: '',
    businessId: '',
  });

  useEffect(() => {
    setFilters((current) =>
      current.status === statusFromUrl ? current : { ...current, status: statusFromUrl },
    );
  }, [statusFromUrl]);

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

  const lastRefresh = boardQuery.dataUpdatedAt ? new Date(boardQuery.dataUpdatedAt) : null;

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

  function writeStatusToUrl(status: DeliveryStatusFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updateFilter<K extends keyof DeliveryFilters>(key: K, value: DeliveryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === 'status') {
      writeStatusToUrl(value as DeliveryStatusFilter);
    }
  }

  function clearAllFilters() {
    setFilters({
      status: 'all',
      courierId: '',
      lockerId: '',
      businessId: '',
    });
    writeStatusToUrl('all');
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.borderSubtle}`,
          padding: '1.25rem 0',
          marginBottom: '1.5rem',
          width: '100%',
          flexWrap: 'wrap',
          gap: '0.5rem 0',
        }}
      >
        {summaryCards.map((card, index) => {
          const isActive = filters.status === card.key;
          return (
            <Fragment key={card.key}>
              {index > 0 && (
                <div
                  style={{
                    width: 1,
                    height: 32,
                    backgroundColor: colors.borderSubtle,
                    alignSelf: 'center',
                    flexShrink: 0,
                  }}
                />
              )}
              <button
                type="button"
                onClick={() =>
                  updateFilter('status', filters.status === card.key ? 'all' : card.key)
                }
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceSubtle;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
                style={{
                  flex: '1 1 140px',
                  padding: '0.5rem 1.5rem',
                  minWidth: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: radius.sm,
                  transition: 'background-color 0.2s ease',
                }}
              >
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {card.label}
                </span>
                <span
                  style={{
                    margin: '0.25rem 0 0',
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: isActive ? colors.primary : colors.secondary,
                    lineHeight: 1.1,
                  }}
                >
                  {card.value}
                </span>
              </button>
            </Fragment>
          );
        })}
        
        <div
          style={{
            width: 1,
            height: 32,
            backgroundColor: colors.borderSubtle,
            alignSelf: 'center',
            flexShrink: 0,
          }}
        />

        <div
          style={{
            flex: '1 1 140px',
            padding: '0.5rem 1.5rem',
            minWidth: 140,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Total actif
          </span>
          <span
            style={{
              margin: '0.25rem 0 0',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: colors.secondary,
              lineHeight: 1.1,
            }}
          >
            {summary?.total ?? 0}
          </span>
        </div>
      </div>

      <FilterToolbar
        onClearAll={clearAllFilters}
        filters={[
          {
            id: 'status',
            label: 'Statut',
            value: filters.status,
            emptyValue: 'all',
            options: STATUS_OPTIONS,
            onChange: (value) => updateFilter('status', value as DeliveryStatusFilter),
          },
          {
            id: 'courier',
            label: 'Coursier',
            value: filters.courierId,
            emptyValue: '',
            options: [
              { value: '', label: 'Tous les coursiers' },
              ...couriers.map((c) => ({ value: c.id, label: c.label })),
            ],
            onChange: (value) => updateFilter('courierId', value),
          },
          {
            id: 'locker',
            label: 'Casier',
            value: filters.lockerId,
            emptyValue: '',
            options: [
              { value: '', label: 'Tous les casiers' },
              ...lockers.map((l) => ({ value: l.id, label: l.label })),
            ],
            onChange: (value) => updateFilter('lockerId', value),
          },
          {
            id: 'business',
            label: 'Entreprise',
            value: filters.businessId,
            emptyValue: '',
            options: [
              { value: '', label: 'Toutes les entreprises' },
              ...businesses.map((b) => ({ value: b.id, label: b.label })),
            ],
            onChange: (value) => updateFilter('businessId', value),
          },
        ]}
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
        }}
      >
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
        <FlashBanner
          message={`${errorMessage} Les données affichées peuvent être obsolètes.`}
          variant="error"
        />
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
                    <span style={{ fontSize: '0.8125rem', opacity: 0.75 }}>
                      {delivery.parcel.recipientPhone}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '0.85rem 0.75rem',
                      borderBottom: borderSubtle(),
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
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
