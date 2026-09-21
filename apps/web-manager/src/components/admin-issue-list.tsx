'use client';

import type { IssueStatus } from '@eveider/domain';
import { ISSUE_STATUS_LABELS } from '@eveider/domain';
import {
  DataTable,
  DEFAULT_TABLE_PAGE_SIZE,
  FilterToolbar,
  IconAlert,
  StatusBadge,
  TableCellStack,
  TruncatedText,
  type DataTableColumn,
  type StatusBadgeTone,
} from '@eveider/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import type { IssueItem, IssueStatusFilter } from '@/server/issues';

const STATUS_OPTIONS: { value: IssueStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'open', label: ISSUE_STATUS_LABELS.open },
  { value: 'in_progress', label: ISSUE_STATUS_LABELS.in_progress },
  { value: 'resolved', label: ISSUE_STATUS_LABELS.resolved },
];

const STATUS_TONE: Record<IssueStatus, StatusBadgeTone> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
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

const NEXT_STATUS: Partial<Record<IssueStatus, IssueStatus>> = {
  open: 'in_progress',
  in_progress: 'resolved',
};

type AdminIssueListProps = {
  issues: IssueItem[];
};

export function AdminIssueList({ issues }: AdminIssueListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>('open');
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return issues;
    return issues.filter((issue) => issue.status === statusFilter);
  }, [issues, statusFilter]);

  async function advanceStatus(issue: IssueItem) {
    const next = NEXT_STATUS[issue.status];
    if (!next) return;

    setActingId(issue.id);
    setActionError(null);

    try {
      const response = await fetch(`/api/issues/${issue.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Mise à jour échouée');
        return;
      }

      router.refresh();
    } catch {
      setActionError('Impossible de mettre à jour le statut.');
    } finally {
      setActingId(null);
    }
  }

  const columns = useMemo<DataTableColumn<IssueItem>[]>(
    () => [
      {
        id: 'type',
        header: 'Incident',
        sortable: true,
        sortValue: (row) => row.typeLabel,
        cell: (row) => (
          <TableCellStack
            primary={row.typeLabel}
            secondary={
              row.description ? undefined : row.lockerName ? row.lockerName : undefined
            }
          />
        ),
      },
      {
        id: 'description',
        header: 'Détail',
        hideOnMobile: true,
        cell: (row) =>
          row.description ? <TruncatedText maxWidth={280}>{row.description}</TruncatedText> : '—',
      },
      {
        id: 'parcel',
        header: 'Colis',
        sortable: true,
        sortValue: (row) => row.parcelReference ?? '',
        cell: (row) =>
          row.parcelId ? (
            <Link href={`/tableau-de-bord/colis/${row.parcelId}`} className="nb-data-table__link">
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
          <StatusBadge tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.statusLabel}</StatusBadge>
        ),
      },
      {
        id: 'createdAt',
        header: 'Créé',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        numeric: true,
        cell: (row) => (
          <TableCellStack
            primary={formatDate(row.createdAt)}
            secondary={row.reporterName ?? 'Utilisateur'}
          />
        ),
      },
    ],
    [],
  );

  return (
    <div>
      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        filters={
          <FilterToolbar
            embedded
            onClearAll={() => setStatusFilter('all')}
            filters={[
              {
                id: 'status',
                label: 'Statut',
                value: statusFilter,
                emptyValue: 'all',
                options: STATUS_OPTIONS,
                onChange: (value) => setStatusFilter(value as IssueStatusFilter),
              },
            ]}
          />
        }
        emptyTitle={statusFilter === 'all' ? 'Aucun incident' : 'Aucun résultat'}
        emptyDescription={
          statusFilter === 'all'
            ? 'Les signalements apparaîtront ici.'
            : 'Aucun incident ne correspond aux filtres actuels.'
        }
        emptyIcon={<IconAlert />}
        emptyAction={
          statusFilter !== 'all' ? (
            <button
              type="button"
              className="nb-btn nb-btn-secondary nb-btn--sm"
              onClick={() => setStatusFilter('all')}
            >
              Réinitialiser les filtres
            </button>
          ) : undefined
        }
        sortBy="createdAt"
        pageSize={DEFAULT_TABLE_PAGE_SIZE}
        rowPrimaryAction={(row) => {
          const next = NEXT_STATUS[row.status];
          if (!next) return null;
          return {
            label: next === 'in_progress' ? 'Prendre en charge' : 'Marquer résolu',
            disabled: actingId === row.id,
            onClick: () => void advanceStatus(row),
          };
        }}
        rowActions={(row) =>
          row.parcelId
            ? [
                {
                  id: 'parcel',
                  label: 'Voir le colis',
                  href: `/tableau-de-bord/colis/${row.parcelId}`,
                },
              ]
            : []
        }
      />
    </div>
  );
}
