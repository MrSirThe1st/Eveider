'use client';

import { colors } from '@eveider/config-ui';
import {
  DRIVER_OPERATIONAL_STATUS_LABELS,
  DRIVER_OPERATIONAL_STATUSES,
  type DriverOperationalStatus,
} from '@eveider/domain';
import { DataTable, DEFAULT_TABLE_PAGE_SIZE, FilterToolbar, IconSearch, IconTruck, TableCellStack, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DriverStatusBadge } from '@/components/driver-status-badge';
import { ListSearchField } from '@/components/list-search-field';
import { adminDriverPath } from '@/lib/auth-routing';
import { matchesListSearch } from '@/lib/list-search';
import type { DriverListItem } from '@/server/drivers';

type AdminDriverListProps = {
  drivers: DriverListItem[];
  onAddDriver?: () => void;
};

type StatusFilter = 'all' | DriverOperationalStatus;

function todayLabel(count: number): string {
  return `${count} livraison${count === 1 ? '' : 's'}`;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  ...DRIVER_OPERATIONAL_STATUSES.map((status) => ({
    value: status as StatusFilter,
    label: DRIVER_OPERATIONAL_STATUS_LABELS[status],
  })),
];

export function AdminDriverList({ drivers, onAddDriver }: AdminDriverListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const orgOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
      map.set(driver.organizationKey, driver.organizationLabel);
    }
    return [
      { value: 'all', label: 'Toutes' },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [drivers]);

  const cityOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
      if (driver.serviceAreaCityId && driver.serviceAreaCity) {
        map.set(driver.serviceAreaCityId, driver.serviceAreaCity);
      } else if (driver.serviceAreaCity) {
        map.set(driver.serviceAreaCity, driver.serviceAreaCity);
      }
    }
    return [
      { value: 'all', label: 'Toutes' },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [drivers]);

  const zoneOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
      if (cityFilter !== 'all') {
        const matchesCity =
          driver.serviceAreaCityId === cityFilter || driver.serviceAreaCity === cityFilter;
        if (!matchesCity) continue;
      }
      if (driver.serviceAreaId && driver.serviceAreaName) {
        map.set(driver.serviceAreaId, driver.serviceAreaName);
      }
    }
    return [
      { value: 'all', label: 'Toutes' },
      { value: 'none', label: 'Non assignée' },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [drivers, cityFilter]);

  const filtered = useMemo(() => {
    return drivers.filter((driver) => {
      if (statusFilter !== 'all' && driver.status !== statusFilter) return false;
      if (orgFilter !== 'all' && driver.organizationKey !== orgFilter) return false;
      if (cityFilter !== 'all') {
        const matchesCity =
          driver.serviceAreaCityId === cityFilter || driver.serviceAreaCity === cityFilter;
        if (!matchesCity) return false;
      }
      if (zoneFilter === 'none' && driver.serviceAreaId) return false;
      if (zoneFilter !== 'all' && zoneFilter !== 'none' && driver.serviceAreaId !== zoneFilter) {
        return false;
      }
      return matchesListSearch(
        searchQuery,
        driver.fullName,
        driver.email,
        driver.organizationLabel,
        driver.serviceAreaName,
        driver.serviceAreaCity,
        driver.currentDelivery,
      );
    });
  }, [drivers, searchQuery, statusFilter, orgFilter, cityFilter, zoneFilter]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'all' ||
    orgFilter !== 'all' ||
    cityFilter !== 'all' ||
    zoneFilter !== 'all';

  const emptyAction = hasActiveFilters ? (
    <button
      type="button"
      className="nb-btn nb-btn-secondary nb-btn--sm"
      onClick={() => {
        setSearchQuery('');
        setStatusFilter('all');
        setOrgFilter('all');
        setCityFilter('all');
        setZoneFilter('all');
      }}
    >
      Réinitialiser les filtres
    </button>
  ) : onAddDriver ? (
    <button type="button" className="nb-btn nb-btn-primary nb-btn--sm" onClick={onAddDriver}>
      Ajouter un chauffeur
    </button>
  ) : undefined;

  const columns = useMemo<DataTableColumn<DriverListItem>[]>(
    () => [
      {
        id: 'driver',
        header: 'Chauffeur',
        sortable: true,
        sortValue: (row) => row.fullName,
        cell: (row) => (
          <TableCellStack
            primary={
              <Link href={adminDriverPath(row.id)} className="nb-data-table__link">
                {row.fullName}
              </Link>
            }
            secondary={row.email}
          />
        ),
      },
      {
        id: 'organization',
        header: 'Entreprise',
        sortable: true,
        sortValue: (row) => row.organizationLabel,
        cell: (row) => row.organizationLabel,
      },
      {
        id: 'zone',
        header: 'Zone',
        sortable: true,
        sortValue: (row) => row.serviceAreaName ?? '',
        hideOnMobile: true,
        cell: (row) =>
          row.serviceAreaName ? (
            row.serviceAreaName
          ) : (
            <span style={{ color: colors.textMuted }}>—</span>
          ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.statusLabel,
        cell: (row) => <DriverStatusBadge status={row.status} label={row.statusLabel} />,
      },
      {
        id: 'currentDelivery',
        header: 'Livraison en cours',
        hideOnMobile: true,
        cell: (row) =>
          row.currentDelivery ? (
            row.currentDelivery
          ) : (
            <span style={{ color: colors.textMuted }}>—</span>
          ),
      },
      {
        id: 'today',
        header: 'Aujourd’hui',
        sortable: true,
        sortValue: (row) => row.deliveriesToday,
        numeric: true,
        cell: (row) => (
          <span style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
            {todayLabel(row.deliveriesToday)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <section>
      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        search={
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un chauffeur par nom, email ou zone…"
            ariaLabel="Rechercher un chauffeur"
          />
        }
        filters={
          <FilterToolbar
            embedded
            onClearAll={() => {
              setStatusFilter('all');
              setOrgFilter('all');
              setCityFilter('all');
              setZoneFilter('all');
            }}
            filters={[
              {
                id: 'driver-status',
                label: 'Statut',
                value: statusFilter,
                emptyValue: 'all',
                options: STATUS_OPTIONS,
                onChange: (next) => setStatusFilter(next as StatusFilter),
              },
              {
                id: 'driver-org',
                label: 'Entreprise',
                value: orgFilter,
                emptyValue: 'all',
                options: orgOptions,
                onChange: setOrgFilter,
              },
              {
                id: 'driver-city',
                label: 'Ville',
                value: cityFilter,
                emptyValue: 'all',
                options: cityOptions,
                onChange: (next) => {
                  setCityFilter(next);
                  setZoneFilter('all');
                },
              },
              {
                id: 'driver-zone',
                label: 'Zone',
                value: zoneFilter,
                emptyValue: 'all',
                options: zoneOptions,
                onChange: setZoneFilter,
              },
            ]}
          />
        }
        emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucun chauffeur Eveider disponible.'}
        emptyDescription={
          hasActiveFilters
            ? 'Aucun chauffeur ne correspond aux filtres actuels.'
            : 'Ajoutez un chauffeur Eveider.'
        }
        emptyIcon={searchQuery.trim() ? <IconSearch /> : <IconTruck />}
        emptyAction={emptyAction}
        sortBy="driver"
        pageSize={DEFAULT_TABLE_PAGE_SIZE}
        rowPrimaryAction={(row) => ({
          label: 'Détails',
          href: adminDriverPath(row.id),
        })}
      />
    </section>
  );
}
