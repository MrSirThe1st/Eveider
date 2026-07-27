'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo } from 'react';
import type { BusinessListItem } from '@/server/businesses';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type BusinessListProps = {
  businesses: BusinessListItem[];
};

export function BusinessList({ businesses }: BusinessListProps) {
  const columns = useMemo<DataTableColumn<BusinessListItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Entreprise',
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/tableau-de-bord/entreprises/applications/${row.id}`}
            className="nb-data-table__link"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        sortable: true,
        sortValue: (row) => row.contactEmail ?? row.contactPhone ?? '',
        hideOnMobile: true,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: typography.weights.semibold }}>
              {row.contactEmail ?? '—'}
            </div>
            {row.contactPhone ? (
              <div style={{ fontSize: typography.caption.fontSize, color: colors.textMuted }}>
                {row.contactPhone}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Inscrit le',
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
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={businesses}
      getRowId={(row) => row.id}
      caption={
        businesses.length > 0
          ? `${businesses.length} entreprise${businesses.length > 1 ? 's' : ''} active${businesses.length > 1 ? 's' : ''}`
          : undefined
      }
      emptyTitle="Aucune entreprise active"
      emptyDescription="Les comptes partenaires vérifiés apparaîtront ici une fois activés."
      initialSortId="createdAt"
      initialSortDirection="desc"
      rowActions={(row) => [
        {
          id: 'view',
          label: 'Voir le dossier',
          href: `/tableau-de-bord/entreprises/applications/${row.id}`,
        },
      ]}
    />
  );
}
