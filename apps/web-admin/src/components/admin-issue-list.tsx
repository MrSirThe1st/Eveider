'use client';

import { colors, radius } from '@eveider/config-ui';
import type { IssueStatus } from '@eveider/domain';
import { ISSUE_STATUS_LABELS } from '@eveider/domain';
import { FilterBar, FilterChipGroup } from '@eveider/ui';
import { useCallback, useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';

type IssueItem = {
  id: string;
  typeLabel: string;
  status: IssueStatus;
  statusLabel: string;
  description: string | null;
  parcelReference: string | null;
  lockerName: string | null;
  reporterName: string | null;
  reporterRole: string;
  createdAt: string;
};

type IssueStatusFilter = 'all' | IssueStatus;

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

export function AdminIssueList() {
  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>('open');
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadIssues = useCallback(async (filter: IssueStatusFilter) => {
    setLoading(true);
    setError(null);

    const query = filter === 'all' ? '' : `?status=${filter}`;

    try {
      const response = await fetch(`/api/issues${query}`, { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Chargement échoué');
        setIssues([]);
        return;
      }

      setIssues(result.data.issues);
    } catch {
      setError('Impossible de charger les incidents.');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIssues(statusFilter);
  }, [loadIssues, statusFilter]);

  async function advanceStatus(issue: IssueItem) {
    const next = NEXT_STATUS[issue.status];
    if (!next) return;

    setActingId(issue.id);
    setError(null);

    try {
      const response = await fetch(`/api/issues/${issue.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Mise à jour échouée');
        return;
      }

      await loadIssues(statusFilter);
    } catch {
      setError('Impossible de mettre à jour le statut.');
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

      {loading ? <p style={{ fontWeight: 500 }}>Chargement des incidents…</p> : null}

      {!loading && error ? (
        <div>
          <FlashBanner message={error} variant="error" />
          <button
            type="button"
            onClick={() => void loadIssues(statusFilter)}
            style={{
              marginTop: '0.75rem',
              padding: '0.625rem 1rem',
              background: 'transparent',
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              fontWeight: 600,
              cursor: 'pointer',
              color: colors.secondary,
            }}
          >
            RÉESSAYER
          </button>
        </div>
      ) : null}

      {!loading && !error && issues.length === 0 ? (
        <p style={{ fontWeight: 500, color: colors.secondary }}>Aucun incident pour ce filtre.</p>
      ) : null}

      {!loading && !error && issues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {issues.map((issue) => {
            const next = NEXT_STATUS[issue.status];
            return (
              <article
                key={issue.id}
                style={{
                  background: colors.surface,
                  border: `2px solid ${colors.border}`,
                  borderRadius: radius.card,
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
                    <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.04em' }}>
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
                      marginTop: '0.75rem',
                      padding: '0.5rem 0.875rem',
                      background: 'transparent',
                      border: `2px solid ${colors.border}`,
                      borderRadius: radius.button,
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      letterSpacing: '0.04em',
                      cursor: actingId === issue.id ? 'wait' : 'pointer',
                      color: colors.secondary,
                      opacity: actingId === issue.id ? 0.7 : 1,
                    }}
                  >
                    {actingId === issue.id
                      ? 'MISE À JOUR…'
                      : next === 'in_progress'
                        ? 'PRENDRE EN CHARGE'
                        : 'MARQUER RÉSOLU'}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
