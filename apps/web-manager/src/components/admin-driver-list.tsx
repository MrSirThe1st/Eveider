'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import {
  DRIVER_OPERATIONAL_STATUS_LABELS,
  DRIVER_OPERATIONAL_STATUSES,
  type DriverOperationalStatus,
} from '@eveider/domain';
import { DataTable, FilterToolbar, IconSearch, IconTruck, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DriverStatusBadge } from '@/components/driver-status-badge';
import { ListSearchField } from '@/components/list-search-field';
import { WEB_ROUTES, adminDriverPath } from '@/lib/auth-routing';
import { matchesListSearch } from '@/lib/list-search';
import type { DriverListItem } from '@/server/drivers';

type AdminDriverListProps = {
  drivers: DriverListItem[];
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

export function AdminDriverList({ drivers }: AdminDriverListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [orgFilter, setOrgFilter] = useState('all');
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

  const zoneOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
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
  }, [drivers]);

  const filtered = useMemo(() => {
    return drivers.filter((driver) => {
      if (statusFilter !== 'all' && driver.status !== statusFilter) return false;
      if (orgFilter !== 'all' && driver.organizationKey !== orgFilter) return false;
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
        driver.currentDelivery,
      );
    });
  }, [drivers, searchQuery, statusFilter, orgFilter, zoneFilter]);

  const columns = useMemo<DataTableColumn<DriverListItem>[]>(
    () => [
      {
        id: 'driver',
        header: 'Chauffeur',
        sortable: true,
        sortValue: (row) => row.fullName,
        cell: (row) => (
          <div>
            <Link href={adminDriverPath(row.id)} className="nb-data-table__link">
              {row.fullName}
            </Link>
            <p
              style={{
                margin: `${spacing[1]}px 0 0`,
                fontSize: typography.caption.fontSize,
                color: colors.textMuted,
              }}
            >
              {row.email}
            </p>
          </div>
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
        align: 'right',
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
      <FilterToolbar
        onClearAll={() => {
          setStatusFilter('all');
          setOrgFilter('all');
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
            id: 'driver-zone',
            label: 'Zone',
            value: zoneFilter,
            emptyValue: 'all',
            options: zoneOptions,
            onChange: setZoneFilter,
          },
        ]}
      />

      <div style={{ marginBottom: spacing[4] }}>
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un chauffeur…"
          ariaLabel="Rechercher un chauffeur"
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        caption={filtered.length > 0 ? `${filtered.length} chauffeurs` : undefined}
        emptyTitle={
          searchQuery.trim()
            ? 'Aucun chauffeur pour cette recherche'
            : 'Aucun chauffeur'
        }
        emptyDescription="Ajoutez un chauffeur Eveider, ou attendez ceux des entreprises."
        emptyIcon={searchQuery.trim() ? <IconSearch /> : <IconTruck />}
        emptyAction={
          <Link href={WEB_ROUTES.adminNewDriver} className="nb-btn nb-btn-primary nb-btn--sm">
            Ajouter un chauffeur
          </Link>
        }
        initialSortId="driver"
        initialSortDirection="asc"
        rowActions={(row) => [
          {
            id: 'view',
            label: 'Voir le profil',
            href: adminDriverPath(row.id),
          },
        ]}
      />
    </section>
  );
}
