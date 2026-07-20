'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import {
  BUSINESS_STATUSES,
  BUSINESS_STATUS_LABELS,
  canTransitionBusiness,
  type BusinessStatus,
} from '@eveider/domain';
import { useCallback, useEffect, useState } from 'react';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { FlashBanner } from '@/components/flash-banner';

type BusinessItem = {
  id: string;
  name: string;
  status: BusinessStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
};

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

export function BusinessList() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/businesses', { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Chargement échoué');
        setBusinesses([]);
        return;
      }

      setBusinesses(result.data.businesses);
    } catch {
      setError('Impossible de charger les entreprises.');
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);

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

      setBusinesses((prev) =>
        prev.map((item) => (item.id === businessId ? { ...item, status: nextStatus } : item)),
      );
      setSuccessMessage(`Statut mis à jour : ${BUSINESS_STATUS_LABELS[nextStatus]}`);
    } catch {
      setActionError('Impossible de mettre à jour le statut.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      {successMessage ? <FlashBanner message={successMessage} /> : null}
      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

      {loading ? <p style={{ fontWeight: 500 }}>Chargement des entreprises…</p> : null}

      {!loading && error ? (
        <div>
          <FlashBanner message={error} variant="error" />
          <button
            type="button"
            onClick={() => void loadBusinesses()}
            style={{
              height: spacing.buttonHeight,
              padding: '0 1.5rem',
              background: 'transparent',
              color: colors.secondary,
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            RÉESSAYER
          </button>
        </div>
      ) : null}

      {!loading && !error && businesses.length === 0 ? (
        <section
          style={{
            background: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radius.card,
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, letterSpacing: '0.04em' }}>AUCUNE ENTREPRISE</p>
        </section>
      ) : null}

      {!loading && !error && businesses.length > 0 ? (
        <>
          <p
            style={{
              margin: '0 0 1rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.06em',
            }}
          >
            {businesses.length} ENTREPRISES
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {businesses.map((business) => {
              const nextStatuses = getNextStatuses(business.status);

              return (
                <section
                  key={business.id}
                  style={{
                    background: colors.surface,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radius.card,
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
                      <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.04em' }}>
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
                        borderTop: `2px solid ${colors.border}`,
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
                            padding: '0.45rem 0.75rem',
                            background: 'transparent',
                            color: colors.secondary,
                            border: `2px solid ${colors.border}`,
                            borderRadius: radius.button,
                            fontWeight: 600,
                            fontSize: '0.6875rem',
                            letterSpacing: '0.04em',
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
        </>
      ) : null}
    </div>
  );
}
