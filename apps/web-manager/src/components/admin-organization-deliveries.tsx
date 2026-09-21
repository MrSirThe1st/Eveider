'use client';

import { colors } from '@eveider/config-ui';
import { DataTable, IconTruck, TableCellStack, type DataTableColumn } from '@eveider/ui';
import { useMemo } from 'react';
import type { AdminOrganizationDeliveryItem } from '@/server/organizations';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type AdminOrganizationDeliveriesProps = {
  deliveries: AdminOrganizationDeliveryItem[];
};

export function AdminOrganizationDeliveries({ deliveries }: AdminOrganizationDeliveriesProps) {
  const columns = useMemo<DataTableColumn<AdminOrganizationDeliveryItem>[]>(
    () => [
      {
        id: 'tracking',
        header: 'Colis',
        sortable: true,
        sortValue: (row) => row.trackingNumber,
        cell: (row) => (
          <TableCellStack primary={row.trackingNumber} secondary={row.reference ?? undefined} />
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.statusLabel,
        cell: (row) => row.statusLabel,
      },
      {
        id: 'driver',
        header: 'Chauffeur',
        hideOnMobile: true,
        cell: (row) => row.driverName ?? '—',
      },
      {
        id: 'createdAt',
        header: 'Créée le',
        numeric: true,
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        cell: (row) => (
          <span style={{ color: colors.textMuted }}>{formatDate(row.createdAt)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={deliveries}
      getRowId={(row) => row.id}
      sortBy="createdAt"
      emptyTitle="Aucune livraison pour cette organisation"
      emptyDescription="Les livraisons de cette organisation apparaîtront ici."
      emptyIcon={<IconTruck />}
    />
  );
}
