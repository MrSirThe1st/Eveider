'use client';

import { colors, webCardStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import type { IssueStatus } from '@eveider/domain';
import { ISSUE_STATUS_LABELS } from '@eveider/domain';
import { FilterBar, FilterChipGroup } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import type { IssueItem, IssueStatusFilter } from '@/server/issues';

const STATUS_FILTERS: { value: IssueStatusFilter; label: string }[] = [
  { value: 'all', label: 'TOUS' },
  { value: 'open', label: ISSUE_STATUS_LABELS.open },
  { value: 'in_progress', label: ISSUE_STATUS_LABELS.in_progress },
  { value: 'resolved', label: ISSUE_STATUS_LABELS.resolved },
];

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

  return (
    <div>
      <FilterBar label="FILTRER PAR STATUT">
        <FilterChipGroup
          items={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </FilterBar>

      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

      {filtered.length === 0 ? (
        <p style={{ fontWeight: 500, color: colors.secondary }}>Aucun incident pour ce filtre.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((issue) => {
            const next = NEXT_STATUS[issue.status];
            return (
              <article
                key={issue.id}
                style={{
                  ...webCardStyle,
                  padding: '1rem 1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      {issue.typeLabel}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {issue.parcelReference ? `Colis ${issue.parcelReference}` : 'Sans colis'}
                      {issue.lockerName ? ` · ${issue.lockerName}` : ''}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {issue.statusLabel}
                  </span>
                </div>

                {issue.description ? (
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {issue.description}
                  </p>
                ) : null}

                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500, opacity: 0.7 }}>
                  {issue.reporterName ?? 'Utilisateur'} ({issue.reporterRole.toUpperCase()}) ·{' '}
                  {formatDate(issue.createdAt)}
                </p>

                {next ? (
                  <button
                    type="button"
                    disabled={actingId === issue.id}
                    onClick={() => void advanceStatus(issue)}
                    style={{
                      ...webSecondaryButtonStyle,
                      marginTop: '0.75rem',
                      padding: '0.5rem 0.875rem',
                      fontSize: '0.6875rem',
                      cursor: actingId === issue.id ? 'wait' : 'pointer',
                      opacity: actingId === issue.id ? 0.7 : 1,
                    }}
                  >
                    {actingId === issue.id
                      ? 'Mise à jour…'
                      : next === 'in_progress'
                        ? 'Prendre en charge'
                        : 'Marquer résolu'}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
