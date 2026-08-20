'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn, EmptyState, ErrorState, TableSkeleton } from '@eveider/ui';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { businessParcelPath } from '@/lib/auth-routing';

type IssueRow = {
  id: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  description: string;
  parcelId: string | null;
  parcelReference: string | null;
  lockerName: string | null;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function BusinessIssueList() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/entreprise/issues', { cache: 'no-store' });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de charger les incidents.');
        return;
      }
      setIssues(result.data.issues as IssueRow[]);
    } catch {
      setError('Impossible de charger les incidents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<DataTableColumn<IssueRow>[]>(
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

  if (loading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Incidents indisponibles"
        message={error}
        action={
          <button type="button" className="nb-btn nb-btn-secondary nb-btn--sm" onClick={() => void load()}>
            Réessayer
          </button>
        }
      />
    );
  }

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
