'use client';

import { colors, spacing, typography, webInputStyle } from '@eveider/config-ui';
import { DataTable, IconSearch, IconTruck, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DriverStatusBadge } from '@/components/driver-status-badge';
import { DriverStatusFilters, type DriverStatusFilter } from '@/components/driver-status-filters';
import { ListSearchField } from '@/components/list-search-field';
import { WEB_ROUTES, businessDriverPath } from '@/lib/auth-routing';
import { matchesListSearch } from '@/lib/list-search';
import type { DriverListItem } from '@/server/drivers';

type BusinessDriverListProps = {
  drivers: DriverListItem[];
};

function todayLabel(count: number): string {
  return `${count} livraison${count === 1 ? '' : 's'}`;
}

export function BusinessDriverList({ drivers }: BusinessDriverListProps) {
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const zoneOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
      if (driver.serviceAreaId && driver.serviceAreaName) {
        map.set(driver.serviceAreaId, driver.serviceAreaName);
      }
    }
    return [
      { value: 'all', label: 'Toutes les zones' },
      { value: 'none', label: 'Non assignée' },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [drivers]);

  const filtered = useMemo(() => {
    return drivers.filter((driver) => {
      if (statusFilter !== 'all' && driver.status !== statusFilter) return false;
      if (zoneFilter === 'none' && driver.serviceAreaId) return false;
      if (zoneFilter !== 'all' && zoneFilter !== 'none' && driver.serviceAreaId !== zoneFilter) {
        return false;
      }
      return matchesListSearch(
        searchQuery,
        driver.fullName,
        driver.email,
        driver.serviceAreaName,
        driver.currentDelivery,
      );
    });
  }, [drivers, searchQuery, statusFilter, zoneFilter]);

  const columns = useMemo<DataTableColumn<DriverListItem>[]>(
    () => [
      {
        id: 'driver',
        header: 'Chauffeur',
        sortable: true,
        sortValue: (row) => row.fullName,
        cell: (row) => (
          <div>
            <Link href={businessDriverPath(row.id)} className="nb-data-table__link">
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
        id: 'zone',
        header: 'Zone',
        hideOnMobile: true,
        sortable: true,
        sortValue: (row) => row.serviceAreaName ?? '',
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
      <DriverStatusFilters value={statusFilter} onChange={setStatusFilter} />

      <div
        style={{
          marginBottom: spacing[4],
          display: 'grid',
          gap: spacing[3],
          gridTemplateColumns: zoneOptions.length > 2 ? 'minmax(0, 1fr) 220px' : '1fr',
        }}
      >
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un chauffeur…"
          ariaLabel="Rechercher un chauffeur"
        />
        {zoneOptions.length > 2 ? (
          <select
            value={zoneFilter}
            onChange={(event) => setZoneFilter(event.target.value)}
            aria-label="Filtrer par zone de service"
            style={{
              ...webInputStyle,
              height: 42,
              padding: '0 10px',
            }}
          >
            {zoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        caption={filtered.length > 0 ? `${filtered.length} chauffeurs` : undefined}
        emptyTitle={
          searchQuery.trim()
            ? 'Aucun chauffeur pour cette recherche'
            : statusFilter === 'all'
              ? 'Aucun chauffeur'
              : 'Aucun chauffeur pour ce filtre'
        }
        emptyDescription={
          searchQuery.trim()
            ? 'Essayez un autre nom ou e-mail.'
            : 'Ajoutez un chauffeur pour l’app mobile. Ses pièces sont enregistrées chez Eveider.'
        }
        emptyIcon={
          searchQuery.trim() || statusFilter !== 'all' ? <IconSearch /> : <IconTruck />
        }
        emptyAction={
          <Link href={WEB_ROUTES.businessNewDriver} className="nb-btn nb-btn-primary nb-btn--sm">
            Ajouter un chauffeur
          </Link>
        }
        initialSortId="driver"
        initialSortDirection="asc"
        rowActions={(row) => [
          {
            id: 'view',
            label: 'Voir le profil',
            href: businessDriverPath(row.id),
          },
        ]}
      />
    </section>
  );
}
