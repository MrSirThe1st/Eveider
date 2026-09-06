'use client';

import { colors } from '@eveider/config-ui';
import { DataTable, IconTruck, type DataTableColumn } from '@eveider/ui';
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
          <Link href={adminDriverPath(row.id)} className="nb-data-table__link">
            {row.fullName}
          </Link>
        ),
      },
      {
        id: 'email',
        header: 'E-mail',
        hideOnMobile: true,
        cell: (row) => row.email,
      },
      {
        id: 'status',
        header: 'Statut',
        cell: (row) => <DriverStatusBadge status={row.status} label={row.statusLabel} />,
      },
      {
        id: 'deliveriesToday',
        header: 'Aujourd’hui',
        align: 'right',
        hideOnMobile: true,
        cell: (row) => (
          <span style={{ color: colors.textMuted }}>{row.deliveriesToday}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={drivers}
      getRowId={(row) => row.id}
      emptyTitle="Aucun chauffeur pour cette organisation"
      emptyDescription="Aucun chauffeur rattaché à cette organisation pour le moment."
      emptyIcon={<IconTruck />}
      rowActions={(row) => [
        {
          id: 'view',
          label: 'Voir',
          href: adminDriverPath(row.id),
        },
      ]}
    />
  );
}
