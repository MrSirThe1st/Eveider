'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn, EmptyState } from '@eveider/ui';
import Link from 'next/link';
import { useMemo } from 'react';
import { businessParcelPath } from '@/lib/auth-routing';
import type { IssueItem } from '@/server/issues';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type BusinessIssueListProps = {
  issues: IssueItem[];
};

export function BusinessIssueList({ issues }: BusinessIssueListProps) {
  const columns = useMemo<DataTableColumn<IssueItem>[]>(
    () => [
      {
        id: 'type',
        header: 'Type',
        sortable: true,
        sortValue: (row) => row.typeLabel,
        cell: (row) => row.typeLabel,
      },
      {
        id: 'parcel',
        header: 'Colis',
        sortable: true,
        sortValue: (row) => row.parcelReference ?? row.parcelId ?? '',
        cell: (row) =>
          row.parcelId ? (
            <Link href={businessParcelPath(row.parcelId)} className="nb-data-table__link">
              {row.parcelReference ?? 'Voir le colis'}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <span style={{ fontSize: typography.caption.fontSize, fontWeight: 700 }}>
            {row.statusLabel}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Créé le',
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

  if (issues.length === 0) {
    return (
      <EmptyState
        title="Aucun incident"
        description="Signalez un problème depuis la fiche d’un colis. Les opérations Eveider le traitent ensuite."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={issues}
      getRowId={(row) => row.id}
      caption={`${issues.length} incident${issues.length > 1 ? 's' : ''}`}
      emptyTitle="Aucun incident"
      initialSortId="createdAt"
      initialSortDirection="desc"
    />
  );
}
