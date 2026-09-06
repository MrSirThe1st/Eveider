'use client';

import { colors, radius, webSecondaryButtonStyle } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { EmptyState, FilterToolbar, IconTruck, LoadingSpinner, TableSkeleton } from '@eveider/ui';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import { ListSearchField } from '@/components/list-search-field';
import { ParcelExportMenu } from '@/components/parcel-export-menu';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import {
  type DeliveryBoardView,
  type DeliveryFilters,
  type DeliveryStatusFilter,
  useDeliveriesBoardQuery,
} from '@/hooks/queries/use-deliveries-query';

const STATUS_OPTIONS: { value: DeliveryStatusFilter; label: string }[] = [
  { value: 'all', label: 'Toutes actives' },
  { value: 'assigned', label: DELIVERY_STATUS_LABELS.assigned },
  { value: 'scanned', label: DELIVERY_STATUS_LABELS.scanned },
  { value: 'drop_off_pending', label: DELIVERY_STATUS_LABELS.drop_off_pending },
];

function parseViewParam(raw: string | null): DeliveryBoardView {
  if (raw === 'au_casier' || raw === 'collected' || raw === 'all') return raw;
  return 'active';
}

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

function lockerCell(
  locker: { id: string; name: string; code: string; address: string } | null,
  compartment: { label: string; size: string } | null,
) {
  if (!locker) return '—';
  return (
    <div>
      <Link
        href={`/tableau-de-bord/points/${locker.id}`}
        style={{ color: colors.secondary, textDecoration: 'none', fontWeight: 600 }}
      >
        {locker.name}
      </Link>
      <div style={{ fontSize: '0.8125rem', opacity: 0.75 }}>
        {locker.code}
        {compartment ? ` · ${compartment.label} (${compartment.size})` : ''}
      </div>
    </div>
  );
}

export function AdminLiveDeliveryBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewFromUrl = parseViewParam(searchParams.get('view'));
  const statusFromUrl = parseStatusParam(searchParams.get('status'));

  const [filters, setFilters] = useState<DeliveryFilters>({
    view: viewFromUrl,
    status: statusFromUrl,
    courierId: '',
    lockerId: '',
    businessId: '',
    search: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, search: debouncedSearch }));
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedSearch]);

  useEffect(() => {
    setFilters((current) =>
      current.view === viewFromUrl && current.status === statusFromUrl
        ? current
        : { ...current, view: viewFromUrl, status: statusFromUrl },
    );
  }, [statusFromUrl, viewFromUrl]);

  const boardQuery = useDeliveriesBoardQuery(filters);
  const items = boardQuery.data?.items ?? [];
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

  const showInitialLoader = boardQuery.isLoading && items.length === 0;
  const showFatalError = boardQuery.isError && items.length === 0;
  const showRefreshError = boardQuery.isError && items.length > 0;
  const errorMessage =
    boardQuery.error instanceof Error
      ? boardQuery.error.message
      : 'Impossible de charger les livraisons.';

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

  function writeUrlParams(next: { view?: DeliveryBoardView; status?: DeliveryStatusFilter }) {
    const params = new URLSearchParams(searchParams.toString());
    const view = next.view ?? filters.view;
    const status = next.status ?? filters.status;
    if (view === 'active') params.delete('view');
    else params.set('view', view);
    if (view !== 'active' || status === 'all') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updateFilter<K extends keyof DeliveryFilters>(key: K, value: DeliveryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === 'view') writeUrlParams({ view: value as DeliveryBoardView });
    if (key === 'status') writeUrlParams({ status: value as DeliveryStatusFilter });
  }

  function clearAllFilters() {
    setDebouncedSearch('');
    setFilters({
      view: filters.view,
      status: 'all',
      courierId: '',
      lockerId: '',
      businessId: '',
      search: '',
    });
    writeUrlParams({ status: 'all' });
  }

  return (
    <div>
      {filters.view === 'active' ? (
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
                {index > 0 ? (
                  <div
                    style={{
                      width: 1,
                      height: 32,
                      backgroundColor: colors.borderSubtle,
                      alignSelf: 'center',
                    }}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    updateFilter('status', filters.status === card.key ? 'all' : card.key)
                  }
                  style={{
                    flex: '1 1 140px',
                    padding: '0.5rem 1.5rem',
                    minWidth: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: radius.sm,
                  }}
                >
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: colors.textMuted }}>
                    {card.label}
                  </span>
                  <span
                    style={{
                      margin: '0.25rem 0 0',
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: isActive ? colors.primary : colors.secondary,
                    }}
                  >
                    {card.value}
                  </span>
                </button>
              </Fragment>
            );
          })}
          <div style={{ width: 1, height: 32, backgroundColor: colors.borderSubtle, alignSelf: 'center' }} />
          <div style={{ flex: '1 1 140px', padding: '0.5rem 1.5rem', minWidth: 140 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: colors.textMuted }}>
              Total actif
            </span>
            <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '1.75rem', fontWeight: 700 }}>
              {summary?.total ?? 0}
            </span>
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 200 }}>
          <ListSearchField
            value={debouncedSearch}
            onChange={setDebouncedSearch}
            placeholder="Rechercher par numéro de suivi…"
            ariaLabel="Rechercher une activité par numéro de suivi"
          />
        </div>
        <ParcelExportMenu
          compact
          exportPath="/api/deliveries/board/export"
          filters={{
            view: filters.view,
            status: filters.status === 'all' ? undefined : filters.status,
            courierId: filters.courierId || undefined,
            lockerId: filters.lockerId || undefined,
            businessId: filters.businessId || undefined,
            search: debouncedSearch.trim() || undefined,
          }}
        />
      </div>

      <FilterToolbar
        onClearAll={clearAllFilters}
        filters={[
          ...(filters.view === 'active'
            ? [
                {
                  id: 'status',
                  label: 'Statut',
                  value: filters.status,
                  emptyValue: 'all',
                  options: STATUS_OPTIONS,
                  onChange: (value: string) =>
                    updateFilter('status', value as DeliveryStatusFilter),
                },
              ]
            : []),
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

      {boardQuery.isFetching && items.length > 0 ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <LoadingSpinner compact size="sm" label="Mise à jour…" />
        </div>
      ) : null}

      {showInitialLoader ? <TableSkeleton rows={8} /> : null}
      {showFatalError ? (
        <div>
          <FlashBanner message={errorMessage} variant="error" />
          <button type="button" onClick={() => void boardQuery.refetch()} style={webSecondaryButtonStyle}>
            Réessayer
          </button>
        </div>
      ) : null}
      {showRefreshError ? (
        <FlashBanner message={`${errorMessage} Les données affichées peuvent être obsolètes.`} variant="error" />
      ) : null}

      {!showInitialLoader && !showFatalError && items.length === 0 ? (
        <EmptyState
          compact
          title="Aucun élément pour ces filtres"
          description="Modifiez les filtres ou changez d’onglet pour voir d’autres livraisons."
          icon={<IconTruck />}
        />
      ) : null}

      {!showInitialLoader && !showFatalError && items.length > 0 ? (
        <div className="nb-data-table">
        <div className="nb-data-table__scroll">
          <table>
            <thead>
              <tr>
                {['Colis', 'Statut', 'Coursier', 'Entreprise', 'Casier', 'Destinataire', 'Maj', ''].map(
                  (heading) => (
                    <th key={heading || 'actions'}>{heading}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.kind}-${item.id}`} className="nb-data-table__row">
                  <td>
                    <Link
                      href={`/tableau-de-bord/colis/${item.parcel.id}`}
                      className="nb-data-table__link"
                    >
                      {item.parcel.trackingNumber}
                    </Link>
                  </td>
                  <td>
                    {item.kind === 'delivery' ? (
                      <DeliveryStatusBadge status={item.status as never} />
                    ) : (
                      <ParcelStatusBadge status={item.status as never} />
                    )}
                  </td>
                  <td>
                    {item.courier ? (
                      <Link
                        href={`/tableau-de-bord/utilisateurs/${item.courier.id}`}
                        className="nb-data-table__link"
                      >
                        {item.courier.fullName ?? item.courier.email ?? 'Chauffeur'}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{item.parcel.business.name}</td>
                  <td>{lockerCell(item.parcel.locker, item.parcel.compartment)}</td>
                  <td>
                    {item.parcel.recipientName ?? '—'}
                    <br />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {item.parcel.recipientPhone}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                    {formatDateTime(item.updatedAt)}
                  </td>
                  <td className="nb-data-table__actions">
                    <Link href={`/tableau-de-bord/colis/${item.parcel.id}`} className="nb-data-table__link">
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      ) : null}
    </div>
  );
}
