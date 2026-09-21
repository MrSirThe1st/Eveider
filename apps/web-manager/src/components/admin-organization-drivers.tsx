'use client';

import { colors } from '@eveider/config-ui';
import { DataTable, IconTruck, TableCellStack, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo } from 'react';
import { DriverStatusBadge } from '@/components/driver-status-badge';
import { adminDriverPath } from '@/lib/auth-routing';
import type { DriverListItem } from '@/server/drivers';

type AdminOrganizationDriversProps = {
  drivers: DriverListItem[];
};

export function AdminOrganizationDrivers({ drivers }: AdminOrganizationDriversProps) {
  const columns = useMemo<DataTableColumn<DriverListItem>[]>(
    () => [
      {
        id: 'name',
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
        id: 'status',
        header: 'Statut',
        cell: (row) => <DriverStatusBadge status={row.status} label={row.statusLabel} />,
      },
      {
        id: 'deliveriesToday',
        header: 'Aujourd’hui',
        numeric: true,
        hideOnMobile: true,
        cell: (row) => (
          <span style={{ color: colors.textMuted }}>{row.deliveriesToday}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: colors.textMuted }}>
        Les chauffeurs d’organisation ne font plus partie du modèle opérationnel. La flotte Eveider
        se gère dans Flotte.
      </p>
      <DataTable
        columns={columns}
        rows={drivers}
        getRowId={(row) => row.id}
        sortBy="name"
        emptyTitle="Aucun chauffeur d’organisation à afficher"
        emptyDescription="Ce n’est plus un modèle actif. Consultez Flotte pour les chauffeurs Eveider."
        emptyIcon={<IconTruck />}
        rowPrimaryAction={(row) => ({
          label: 'Détails',
          href: adminDriverPath(row.id),
        })}
      />
    </div>
  );
}
