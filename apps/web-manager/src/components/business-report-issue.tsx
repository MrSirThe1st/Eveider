'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import { ISSUE_TYPE_LABELS, type IssueType } from '@eveider/domain';
import { Button, InlineAlert, TextField } from '@eveider/ui';
import { useState, type FormEvent } from 'react';
import type { IssueItem } from '@/server/issues';

const BUSINESS_ISSUE_TYPES: IssueType[] = [
  'parcel_problem',
  'locker_unavailable',
  'locker_system',
];

type IssueListItem = Pick<IssueItem, 'id' | 'typeLabel' | 'statusLabel' | 'description' | 'createdAt'>;

type BusinessReportIssueProps = {
  parcelId: string;
  initialIssues: IssueListItem[];
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function BusinessReportIssue({ parcelId, initialIssues }: BusinessReportIssueProps) {
  const [issues, setIssues] = useState<IssueListItem[]>(initialIssues);
  const [type, setType] = useState<IssueType>('parcel_problem');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/organisation/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, parcelId, description }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible d’envoyer l’incident');
        return;
      }
      const created = result.data.issue as IssueItem;
      setIssues((prev) => [
        {
          id: created.id,
          typeLabel: created.typeLabel,
          statusLabel: created.statusLabel,
          description: created.description,
          createdAt: created.createdAt,
        },
        ...prev,
      ]);
      setDescription('');
      setSuccess('Incident transmis à Eveider.');
    } catch {
      setError('Impossible d’envoyer l’incident.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {issues.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: `0 0 ${spacing[5]}px`, padding: 0 }}>
          {issues.map((issue) => (
            <li
              key={issue.id}
              style={{
                padding: `${spacing[3]}px 0`,
                borderBottom: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: typography.bodySm.fontSize }}>
                {issue.typeLabel} · {issue.statusLabel}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: typography.caption.fontSize,
                  color: colors.textMuted,
                }}
              >
                {issue.description} · {formatDate(issue.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)}>
        <label
          htmlFor="issue-type"
          style={{
            display: 'block',
            fontSize: typography.caption.fontSize,
            fontWeight: 600,
            marginBottom: spacing[2],
          }}
        >
          Type
        </label>
        <select
          id="issue-type"
          value={type}
          onChange={(event) => setType(event.target.value as IssueType)}
          className="nb-input"
          style={{ width: '100%', marginBottom: spacing[4], height: 44 }}
        >
          {BUSINESS_ISSUE_TYPES.map((value) => (
            <option key={value} value={value}>
              {ISSUE_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <TextField
          label="Description"
          name="issue-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Décrivez le problème pour les opérations Eveider."
          required
        />
        {error ? (
          <div style={{ marginTop: spacing[3] }}>
            <InlineAlert message={error} variant="error" />
          </div>
        ) : null}
        {success ? (
          <div style={{ marginTop: spacing[3] }}>
            <InlineAlert message={success} variant="success" />
          </div>
        ) : null}
        <div style={{ marginTop: spacing[4] }}>
          <Button type="submit" variant="secondary" loading={submitting}>
            Signaler un incident
          </Button>
        </div>
      </form>
    </div>
  );
}
