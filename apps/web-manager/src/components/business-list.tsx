'use client';

import { borderSubtle, webCardStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import {
  BUSINESS_STATUSES,
  BUSINESS_STATUS_LABELS,
  canTransitionBusiness,
  type BusinessStatus,
} from '@eveider/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import type { BusinessListItem } from '@/server/businesses';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function getNextStatuses(current: BusinessStatus): BusinessStatus[] {
  return BUSINESS_STATUSES.filter((status) => canTransitionBusiness(current, status));
}

type BusinessListProps = {
  businesses: BusinessListItem[];
};

export function BusinessList({ businesses }: BusinessListProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function updateStatus(businessId: string, nextStatus: BusinessStatus) {
    setUpdatingId(businessId);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/businesses/${businessId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Mise à jour échouée');
        return;
      }

      setSuccessMessage(`Statut mis à jour : ${BUSINESS_STATUS_LABELS[nextStatus]}`);
      router.refresh();
    } catch {
      setActionError('Impossible de mettre à jour le statut.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (businesses.length === 0) {
    return (
      <section
        style={{
          ...webCardStyle,
          padding: '2.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Aucune entreprise</p>
      </section>
    );
  }

  return (
    <div>
      {successMessage ? <FlashBanner message={successMessage} /> : null}
      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

      <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '0.8125rem' }}>
        {businesses.length} entreprises
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {businesses.map((business) => {
          const nextStatuses = getNextStatuses(business.status);

          return (
            <section
              key={business.id}
              style={{
                ...webCardStyle,
                padding: '1.25rem 1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    {business.name}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
                    {business.contactEmail ?? '—'}
                    {business.contactPhone ? ` · ${business.contactPhone}` : ''}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', fontWeight: 500 }}>
                    Inscrit le {formatDate(business.createdAt)}
                  </p>
                </div>
                <BusinessStatusBadge status={business.status} />
              </div>

              {nextStatuses.length > 0 ? (
                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: borderSubtle(),
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  {nextStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingId === business.id}
                      onClick={() => void updateStatus(business.id, status)}
                      style={{
                        ...webSecondaryButtonStyle,
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.6875rem',
                        cursor: updatingId === business.id ? 'wait' : 'pointer',
                      }}
                    >
                      → {BUSINESS_STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
