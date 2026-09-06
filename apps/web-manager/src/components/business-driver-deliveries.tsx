'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, IconTruck, type DataTableColumn } from '@eveider/ui';
import { useMemo } from 'react';
import type { DriverDeliveryItem } from '@/server/drivers';

type BusinessDriverDeliveriesProps = {
  deliveries: DriverDeliveryItem[];
  /** Show parcel organization on admin platform-wide history. */
  showOrganization?: boolean;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function BusinessDriverDeliveries({
  deliveries,
  showOrganization = false,
}: BusinessDriverDeliveriesProps) {
  const columns = useMemo<DataTableColumn<DriverDeliveryItem>[]>(
    () => [
      {
        id: 'tracking',
        header: 'Suivi',
        sortable: true,
        sortValue: (row) => row.trackingNumber,
        cell: (row) => (
          <div>
            <div>{row.trackingNumber}</div>
            {row.reference ? (
              <div style={{ color: colors.textMuted, fontSize: typography.caption.fontSize }}>
                Réf. {row.reference}
              </div>
            ) : null}
          </div>
        ),
      },
      ...(showOrganization
        ? [
            {
              id: 'organization',
              header: 'Organisation',
              hideOnMobile: true,
              cell: (row: DriverDeliveryItem) =>
                row.businessName ?? <span style={{ color: colors.textMuted }}>—</span>,
            } satisfies DataTableColumn<DriverDeliveryItem>,
          ]
        : []),
      {
        id: 'locker',
        header: 'Point',
        hideOnMobile: true,
        cell: (row) => row.lockerName ?? <span style={{ color: colors.textMuted }}>—</span>,
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.statusLabel,
        cell: (row) => row.statusLabel,
      },
      {
        id: 'createdAt',
        header: 'Créée le',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        align: 'right',
        cell: (row) => (
          <span style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
            {formatDate(row.createdAt)}
          </span>
        ),
      },
    ],
    [showOrganization],
  );

  return (
    <DataTable
      columns={columns}
      rows={deliveries}
      getRowId={(row) => row.id}
      emptyTitle="Aucune livraison"
      emptyDescription="Les livraisons assignées à ce chauffeur apparaîtront ici."
      emptyIcon={<IconTruck />}
      initialSortId="createdAt"
      initialSortDirection="desc"
    />
  );
}
