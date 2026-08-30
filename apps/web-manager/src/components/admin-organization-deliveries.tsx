'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn } from '@eveider/ui';
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
          <div>
            <div style={{ fontWeight: typography.weights.semibold }}>{row.trackingNumber}</div>
            {row.reference ? (
              <div style={{ fontSize: typography.caption.fontSize, color: colors.textMuted }}>
                {row.reference}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
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
        align: 'right',
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
      emptyTitle="Aucune livraison pour cette organisation"
    />
  );
}
