'use client';

import { colors, radius, borderSubtle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { FilterToolbar, LoadingSpinner } from '@eveider/ui';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import { ListSearchField } from '@/components/list-search-field';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import {
  DELIVERIES_REFRESH_MS,
  type DeliveryBoardView,
  type DeliveryFilters,
  type DeliveryStatusFilter,
  useDeliveriesBoardQuery,
} from '@/hooks/queries/use-deliveries-query';

const VIEW_TABS: { value: DeliveryBoardView; label: string }[] = [
  { value: 'active', label: 'Actives' },
  { value: 'au_casier', label: 'Au casier' },
  { value: 'collected', label: 'Collectés' },
  { value: 'all', label: 'Toutes les activités' },
];

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
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateFilter('view', tab.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: radius.sm,
              border: `1px solid ${filters.view === tab.value ? colors.primary : colors.borderSubtle}`,
              background: filters.view === tab.value ? colors.surfaceSubtle : colors.surface,
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {filters.view === 'all' || filters.view === 'au_casier' || filters.view === 'collected' ? (
        <div style={{ marginBottom: '1rem' }}>
          <ListSearchField
            value={debouncedSearch}
            onChange={setDebouncedSearch}
            placeholder="Rechercher par numéro de suivi…"
            ariaLabel="Rechercher une activité par numéro de suivi"
          />
        </div>
      ) : null}

      {filters.view === 'active' || filters.view === 'all' ? (
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
      ) : null}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        {boardQuery.isFetching && items.length > 0 ? (
          <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>Mise à jour…</span>
        ) : null}
        {lastRefresh && filters.view === 'active' ? (
          <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>
            Actualisé à {formatDateTime(lastRefresh.toISOString())} · auto {DELIVERIES_REFRESH_MS / 1000}s
          </span>
        ) : null}
      </div>

      {showInitialLoader ? <LoadingSpinner label="Chargement…" /> : null}
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
        <p style={{ fontWeight: 500, color: colors.secondary, opacity: 0.8 }}>
          Aucun élément pour ces filtres.
        </p>
      ) : null}

      {!showInitialLoader && !showFatalError && items.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
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
              {items.map((item) => (
                <tr key={`${item.kind}-${item.id}`}>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    <Link
                      href={`/tableau-de-bord/colis/${item.parcel.id}`}
                      style={{ fontWeight: 700, color: colors.secondary, textDecoration: 'none' }}
                    >
                      {item.parcel.trackingNumber}
                    </Link>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    {item.kind === 'delivery' ? (
                      <DeliveryStatusBadge status={item.status as never} />
                    ) : (
                      <ParcelStatusBadge status={item.status as never} />
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    {item.courier ? (
                      <Link
                        href={`/tableau-de-bord/utilisateurs/${item.courier.id}`}
                        style={{ color: colors.secondary, textDecoration: 'none' }}
                      >
                        {item.courier.fullName ?? item.courier.email ?? 'Coursier'}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    {item.parcel.business.name}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    {lockerCell(item.parcel.locker, item.parcel.compartment)}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    {item.parcel.recipientName ?? '—'}
                    <br />
                    <span style={{ fontSize: '0.8125rem', opacity: 0.75 }}>
                      {item.parcel.recipientPhone}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle(), whiteSpace: 'nowrap' }}>
                    {formatDateTime(item.updatedAt)}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: borderSubtle() }}>
                    <Link href={`/tableau-de-bord/colis/${item.parcel.id}`}>DÉTAIL →</Link>
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
