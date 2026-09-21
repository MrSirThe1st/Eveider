'use client';

import { colors, radius } from '@eveider/config-ui';
import { Button, DataTable, DEFAULT_TABLE_PAGE_SIZE, FilterToolbar, IconTruck, TableCellStack, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import { ListSearchField } from '@/components/list-search-field';
import { ParcelExportMenu } from '@/components/parcel-export-menu';
import {
  getAdminDeliveryStatusLabel,
} from '@/lib/admin-presentation';
import {
  type DeliveryBoardItem,
  type DeliveryBoardView,
  type DeliveryFilters,
  type DeliveryStatusFilter,
  useDeliveriesBoardQuery,
} from '@/hooks/queries/use-deliveries-query';

const STATUS_OPTIONS: { value: DeliveryStatusFilter; label: string }[] = [
  { value: 'all', label: 'Toutes actives' },
  { value: 'assigned', label: getAdminDeliveryStatusLabel('assigned') },
  { value: 'scanned', label: getAdminDeliveryStatusLabel('scanned') },
  { value: 'drop_off_pending', label: getAdminDeliveryStatusLabel('drop_off_pending') },
];

function parseViewParam(raw: string | null): DeliveryBoardView {
  if (raw === 'all') return 'all';
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

export function AdminLiveDeliveryBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewFromUrl = parseViewParam(searchParams.get('view'));
  const statusFromUrl = parseStatusParam(searchParams.get('status'));

  useEffect(() => {
    const legacy = searchParams.get('view');
    if (legacy === 'au_casier') {
      router.replace('/tableau-de-bord/colis?attention=at_locker');
    } else if (legacy === 'collected') {
      router.replace('/tableau-de-bord/colis?attention=ready_for_pickup');
    }
  }, [router, searchParams]);

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
      { key: 'assigned' as const, label: getAdminDeliveryStatusLabel('assigned'), value: summary?.assigned ?? 0 },
      { key: 'scanned' as const, label: getAdminDeliveryStatusLabel('scanned'), value: summary?.scanned ?? 0 },
      {
        key: 'drop_off_pending' as const,
        label: getAdminDeliveryStatusLabel('drop_off_pending'),
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

  const columns = useMemo<DataTableColumn<DeliveryBoardItem>[]>(
    () => [
      {
        id: 'tracking',
        header: 'Suivi',
        sortable: true,
        sortValue: (row) => row.parcel.trackingNumber,
        cell: (row) => (
          <Link href={`/tableau-de-bord/colis/${row.parcel.id}`} className="nb-data-table__link">
            {row.parcel.trackingNumber}
          </Link>
        ),
      },
      {
        id: 'kind',
        header: 'Type',
        sortable: true,
        sortValue: (row) => row.deliveryKindLabel ?? 'Aller',
        hideOnMobile: true,
        cell: (row) => row.deliveryKindLabel ?? 'Aller',
      },
      {
        id: 'status',
        header: 'État',
        sortable: true,
        sortValue: (row) => row.statusLabel,
        cell: (row) => (
          <DeliveryStatusBadge status={row.status as never} label={row.statusLabel} />
        ),
      },
      {
        id: 'courier',
        header: 'Chauffeur',
        sortable: true,
        sortValue: (row) => row.courier?.fullName ?? row.courier?.email ?? '',
        cell: (row) =>
          row.courier ? (
            <Link href={`/tableau-de-bord/flotte/${row.courier.id}`} className="nb-data-table__link">
              {row.courier.fullName ?? row.courier.email ?? 'Chauffeur Eveider'}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        id: 'business',
        header: 'Entreprise',
        sortable: true,
        sortValue: (row) => row.parcel.business.name,
        hideOnMobile: true,
        cell: (row) => row.parcel.business.name,
      },
      {
        id: 'locker',
        header: 'Casier',
        sortable: true,
        sortValue: (row) => row.parcel.locker?.name ?? '',
        hideOnMobile: true,
        cell: (row) =>
          row.parcel.locker ? (
            <TableCellStack
              primary={
                <Link
                  href={`/tableau-de-bord/casiers/${row.parcel.locker.id}`}
                  className="nb-data-table__link"
                >
                  {row.parcel.locker.name}
                </Link>
              }
              secondary={`${row.parcel.locker.code}${
                row.parcel.compartment
                  ? ` · ${row.parcel.compartment.label} (${row.parcel.compartment.size})`
                  : ''
              }`}
            />
          ) : (
            '—'
          ),
      },
      {
        id: 'updatedAt',
        header: 'Maj',
        sortable: true,
        sortValue: (row) => new Date(row.updatedAt).getTime(),
        numeric: true,
        cell: (row) => (
          <span style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
            {formatDateTime(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) ||
    filters.status !== 'all' ||
    Boolean(filters.courierId) ||
    Boolean(filters.lockerId) ||
    Boolean(filters.businessId);

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

      {showRefreshError ? (
        <FlashBanner message={`${errorMessage} Les données affichées peuvent être obsolètes.`} variant="error" />
      ) : null}

      <DataTable
        columns={columns}
        rows={items}
        getRowId={(row) => `${row.kind}-${row.id}`}
        search={
          <ListSearchField
            value={debouncedSearch}
            onChange={setDebouncedSearch}
            placeholder="Rechercher par numéro de suivi…"
            ariaLabel="Rechercher une activité par numéro de suivi"
          />
        }
        filters={
          <FilterToolbar
            embedded
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
                label: 'Chauffeur',
                value: filters.courierId,
                emptyValue: '',
                options: [
                  { value: '', label: 'Tous les chauffeurs Eveider' },
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
        }
        trailing={
          <ParcelExportMenu
            iconOnly
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
        }
        loading={showInitialLoader}
        error={
          showFatalError
            ? {
                title: 'Impossible de charger les livraisons',
                message: errorMessage,
                action: (
                  <Button variant="secondary" onClick={() => void boardQuery.refetch()}>
                    Réessayer
                  </Button>
                ),
              }
            : null
        }
        emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucune livraison Eveider'}
        emptyDescription={
          hasActiveFilters
            ? 'Aucune livraison ne correspond aux filtres actuels.'
            : 'Les transports aller et retours client apparaissent ici.'
        }
        emptyIcon={<IconTruck />}
        emptyAction={
          hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={clearAllFilters}>
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
        sortBy="updatedAt"
        pageSize={DEFAULT_TABLE_PAGE_SIZE}
        rowPrimaryAction={(row) => ({
          label: 'Détails',
          href: `/tableau-de-bord/colis/${row.parcel.id}`,
        })}
      />
    </div>
  );
}
