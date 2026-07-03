'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import {
  COMPARTMENT_SIZE_FULL_LABELS,
  COMPARTMENT_STATUSES,
  COMPARTMENT_STATUS_LABELS,
  LOCKER_STATUS_LABELS,
  LOCKER_STATUSES,
  canTransitionCompartment,
  canTransitionLocker,
  type CompartmentStatus,
  type CompartmentSize,
  type LockerStatus,
} from '@eveider/domain';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CompartmentStatusBadge } from '@/components/compartment-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import { LockerCompartmentCabinet } from '@/components/locker-compartment-cabinet';
import { LockerStatusBadge } from '@/components/locker-status-badge';

type CompartmentItem = {
  id: string;
  label: string;
  size: CompartmentSize;
  status: CompartmentStatus;
};

type LockerDetailData = {
  id: string;
  code: string;
  name: string;
  address: string;
  rows: number;
  columns: number;
  status: LockerStatus;
  compartmentCounts: {
    available: number;
    occupied: number;
    reserved: number;
    total: number;
  };
  compartments: CompartmentItem[];
};

function getNextLockerStatuses(current: LockerStatus): LockerStatus[] {
  return LOCKER_STATUSES.filter((status) => canTransitionLocker(current, status));
}

function getNextCompartmentStatuses(current: CompartmentStatus): CompartmentStatus[] {
  return COMPARTMENT_STATUSES.filter((status) => canTransitionCompartment(current, status));
}

type LockerDetailProps = {
  lockerId: string;
};

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ flex: '1 1 100px' }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          opacity: 0.55,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '0.25rem 0 0',
          fontSize: '1.5rem',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export function LockerDetail({ lockerId }: LockerDetailProps) {
  const [locker, setLocker] = useState<LockerDetailData | null>(null);
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingLocker, setUpdatingLocker] = useState(false);
  const [updatingCompartmentId, setUpdatingCompartmentId] = useState<string | null>(null);

  async function loadLocker() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lockers/${lockerId}`, { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Casier introuvable');
        setLocker(null);
        return;
      }

      setLocker(result.data.locker);
    } catch {
      setError('Impossible de charger le casier.');
      setLocker(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLocker();
  }, [lockerId]);

  useEffect(() => {
    if (!locker) return;
    const previousTitle = document.title;
    document.title = `${locker.code} — ${locker.name} | Eveider`;
    return () => {
      document.title = previousTitle;
    };
  }, [locker]);

  const selectedCompartment = useMemo(
    () => locker?.compartments.find((c) => c.id === selectedCompartmentId) ?? null,
    [locker, selectedCompartmentId],
  );

  const occupancyRate = locker
    ? locker.compartmentCounts.total > 0
      ? Math.round((locker.compartmentCounts.occupied / locker.compartmentCounts.total) * 100)
      : 0
    : 0;

  async function advanceLockerStatus(nextStatus: LockerStatus) {
    setUpdatingLocker(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/lockers/${lockerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Mise à jour échouée');
        return;
      }

      setLocker(result.data.locker);
      setSuccessMessage(`Statut casier : ${LOCKER_STATUS_LABELS[nextStatus]}`);
    } catch {
      setActionError('Impossible de mettre à jour le casier.');
    } finally {
      setUpdatingLocker(false);
    }
  }

  async function advanceCompartmentStatus(compartmentId: string, nextStatus: CompartmentStatus) {
    setUpdatingCompartmentId(compartmentId);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/lockers/${lockerId}/compartments/${compartmentId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Mise à jour échouée');
        return;
      }

      setLocker(result.data.locker);
      setSuccessMessage(`Compartiment mis à jour : ${COMPARTMENT_STATUS_LABELS[nextStatus]}`);
    } catch {
      setActionError('Impossible de mettre à jour le compartiment.');
    } finally {
      setUpdatingCompartmentId(null);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: colors.secondary,
          opacity: 0.6,
        }}
      >
        CHARGEMENT DU CASIER…
      </div>
    );
  }

  if (error || !locker) {
    return (
      <div>
        <p style={{ fontWeight: 500, color: colors.danger }}>{error ?? 'Casier introuvable'}</p>
        <Link href="/tableau-de-bord/casiers" style={{ fontWeight: 600 }}>
          ← Retour aux casiers
        </Link>
      </div>
    );
  }

  const nextLockerStatuses = getNextLockerStatuses(locker.status);
  const nextCompartmentStatuses = selectedCompartment
    ? getNextCompartmentStatuses(selectedCompartment.status)
    : [];

  return (
    <div style={{ maxWidth: 1080 }}>
      {successMessage ? <FlashBanner message={successMessage} /> : null}
      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

      <Link
        href="/tableau-de-bord/casiers"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: '1.25rem',
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.06em',
          color: colors.secondary,
          textDecoration: 'none',
          opacity: 0.7,
        }}
      >
        ← CASIERS
      </Link>

      <header style={{ marginBottom: '1.5rem' }}>
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
            <p
              style={{
                margin: '0 0 0.35rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: colors.primary,
              }}
            >
              {locker.code}
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                lineHeight: 1.2,
              }}
            >
              {locker.name}
            </h2>
            <p style={{ margin: '0.5rem 0 0', fontWeight: 500, fontSize: '0.9375rem', opacity: 0.8 }}>
              {locker.address}
            </p>
            <p
              style={{
                margin: '0.5rem 0 0',
                fontSize: '0.8125rem',
                fontWeight: 600,
                opacity: 0.6,
              }}
            >
              {locker.rows} × {locker.columns} · {locker.compartmentCounts.total} compartiments
            </p>
          </div>
          <LockerStatusBadge status={locker.status} />
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <StatItem label="DISPONIBLES" value={locker.compartmentCounts.available} />
        <StatItem label="OCCUPÉS" value={locker.compartmentCounts.occupied} />
        <StatItem label="RÉSERVÉS" value={locker.compartmentCounts.reserved} />
        <StatItem label="OCCUPATION" value={`${occupancyRate}%`} />
      </div>

      {/* Cabinet + side panel */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        <div style={{ flex: '2 1 340px', minWidth: 0 }}>
          <LockerCompartmentCabinet
            rows={locker.rows}
            columns={locker.columns}
            compartments={locker.compartments}
            selectedId={selectedCompartmentId}
            onSelect={setSelectedCompartmentId}
          />
        </div>

        <aside
          style={{
            flex: '1 1 280px',
            minWidth: 280,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {selectedCompartment ? (
            <>
              <p
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  opacity: 0.55,
                }}
              >
                COMPARTIMENT SÉLECTIONNÉ
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                }}
              >
                {selectedCompartment.label}
              </p>
              <p style={{ margin: '0.5rem 0 1rem', fontWeight: 600, fontSize: '0.8125rem', opacity: 0.7 }}>
                Taille {COMPARTMENT_SIZE_FULL_LABELS[selectedCompartment.size]}
              </p>
              <CompartmentStatusBadge status={selectedCompartment.status} />

              {nextCompartmentStatuses.length > 0 ? (
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                  <p
                    style={{
                      margin: '0 0 0.75rem',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      opacity: 0.55,
                    }}
                  >
                    CHANGER LE STATUT
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {nextCompartmentStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={updatingCompartmentId === selectedCompartment.id}
                        onClick={() =>
                          void advanceCompartmentStatus(selectedCompartment.id, status)
                        }
                        style={{
                          height: spacing.buttonHeight,
                          padding: '0 1.25rem',
                          background: colors.primary,
                          color: colors.secondary,
                          border: 'none',
                          borderRadius: radius.button,
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          letterSpacing: '0.06em',
                          cursor:
                            updatingCompartmentId === selectedCompartment.id ? 'wait' : 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        → {COMPARTMENT_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '1rem 0',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  opacity: 0.55,
                  lineHeight: 1.5,
                }}
              >
                SÉLECTIONNEZ UN COMPARTIMENT
                <br />
                DANS LA GRILLE
              </p>
            </div>
          )}
        </aside>
      </div>
      {nextLockerStatuses.length > 0 ? (
        <section style={{ marginTop: '2rem' }}>
          <p
            style={{
              margin: '0 0 0.75rem',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              opacity: 0.55,
            }}
          >
            STATUT DU CASIER
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {nextLockerStatuses.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updatingLocker}
                onClick={() => void advanceLockerStatus(status)}
                style={{
                  height: spacing.buttonHeight,
                  padding: '0 1.25rem',
                  background: colors.secondary,
                  color: colors.surface,
                  border: 'none',
                  borderRadius: radius.button,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  cursor: updatingLocker ? 'wait' : 'pointer',
                }}
              >
                → {LOCKER_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}