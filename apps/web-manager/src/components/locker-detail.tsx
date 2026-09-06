'use client';

import { colors, radius, spacing, webSecondaryButtonStyle } from '@eveider/config-ui';
import {
  COMPARTMENT_SIZE_FULL_LABELS,
  COMPARTMENT_STATUSES,
  COMPARTMENT_STATUS_LABELS,
  LOCKER_STATUS_LABELS,
  LOCKER_STATUSES,
  canTransitionCompartment,
  canTransitionLocker,
  usesCompartmentGrid,
  type CompartmentStatus,
  type LockerStatus,
} from '@eveider/domain';
import { CardListSkeleton } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CompartmentStatusBadge } from '@/components/compartment-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import { LockerCompartmentCabinet } from '@/components/locker-compartment-cabinet';
import { LockerStatusToggle } from '@/components/locker-status-toggle';
import {
  type LockerDetailData,
  useLockerDetailQuery,
} from '@/hooks/queries/use-locker-detail-query';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';

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
    <div
      style={{
        flex: '1 1 120px',
        padding: '0.5rem 1.5rem',
        minWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: colors.secondary,
          marginTop: '0.25rem',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function LockerDetail({ lockerId }: LockerDetailProps) {
  const { data: locker, isLoading, isError, error: queryError, setData: setLocker } =
    useLockerDetailQuery(lockerId);
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingLocker, setUpdatingLocker] = useState(false);
  const [updatingCompartmentId, setUpdatingCompartmentId] = useState<string | null>(null);
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaOptionDto[]>([]);
  const [savingArea, setSavingArea] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/service-areas', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled || !result.success) return;
        const options = (result.data.serviceAreas as Array<{
          id: string;
          code: string;
          name: string;
          city: string;
          status: string;
        }>)
          .filter((area) => area.status === 'active')
          .map((area) => ({
            id: area.id,
            code: area.code,
            name: area.name,
            city: area.city,
            label: `${area.name} (${area.city})`,
          }));
        setServiceAreas(options);
      })
      .catch(() => {
        /* optional enrichment */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = isLoading && !locker;
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Impossible de charger le point.'
    : null;

  function updateLockerCache(nextLocker: LockerDetailData) {
    setLocker(nextLocker);
  }

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
    ? usesCompartmentGrid(locker.type)
      ? locker.compartmentCounts.total > 0
        ? Math.round((locker.compartmentCounts.occupied / locker.compartmentCounts.total) * 100)
        : 0
      : locker.maxCapacity && locker.maxCapacity > 0
        ? Math.round((locker.occupyingCount / locker.maxCapacity) * 100)
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

      updateLockerCache(result.data.locker);
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

      updateLockerCache(result.data.locker);
      setSuccessMessage(`Compartiment mis à jour : ${COMPARTMENT_STATUS_LABELS[nextStatus]}`);
    } catch {
      setActionError('Impossible de mettre à jour le compartiment.');
    } finally {
      setUpdatingCompartmentId(null);
    }
  }

  if (loading) {
    return <CardListSkeleton cards={3} />;
  }

  if (error || !locker) {
    return (
      <div>
        <p style={{ fontWeight: 500, color: colors.danger }}>{error ?? 'Point introuvable'}</p>
        <Link href="/tableau-de-bord/points" style={{ fontWeight: 600 }}>
          Retour aux points
        </Link>
      </div>
    );
  }

  const nextLockerStatuses = getNextLockerStatuses(locker.status);
  const nextCompartmentStatuses = selectedCompartment
    ? getNextCompartmentStatuses(selectedCompartment.status)
    : [];
  const smartLocker = usesCompartmentGrid(locker.type);

  return (
    <div style={{ width: '100%' }}>
      {successMessage ? <FlashBanner message={successMessage} /> : null}
      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

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
              {locker.code} · {locker.typeLabel}
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
            <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.8125rem', opacity: 0.7 }}>
              Zone : {locker.serviceAreaName ?? 'Non assignée'}
              {locker.city ? ` · Ville : ${locker.city}` : ''}
            </p>
            {serviceAreas.length > 0 ? (
              <label
                style={{
                  display: 'block',
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  maxWidth: 320,
                }}
              >
                Zone de service
                <select
                  value={locker.serviceAreaId ?? ''}
                  disabled={savingArea || updatingLocker}
                  onChange={(event) => {
                    const nextId = event.target.value || null;
                    void (async () => {
                      setSavingArea(true);
                      setActionError(null);
                      setSuccessMessage(null);
                      try {
                        const response = await fetch(`/api/lockers/${lockerId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ serviceAreaId: nextId }),
                        });
                        const result = await response.json();
                        if (!result.success) {
                          setActionError(result.error ?? 'Mise à jour échouée');
                          return;
                        }
                        updateLockerCache(result.data.locker);
                        setSuccessMessage('Zone de service mise à jour.');
                      } catch {
                        setActionError('Impossible de mettre à jour la zone.');
                      } finally {
                        setSavingArea(false);
                      }
                    })();
                  }}
                  style={{
                    display: 'block',
                    marginTop: '0.35rem',
                    width: '100%',
                    height: 40,
                    padding: '0 10px',
                    borderRadius: radius.button,
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.secondary,
                    fontWeight: 600,
                  }}
                >
                  <option value="">Non assignée</option>
                  {serviceAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <p
              style={{
                margin: '0.5rem 0 0',
                fontSize: '0.8125rem',
                fontWeight: 600,
                opacity: 0.6,
              }}
            >
              {smartLocker
                ? `${locker.rows} × ${locker.columns} · ${locker.compartmentCounts.total} compartiments`
                : `${locker.availableSlots} places libres / ${locker.maxCapacity ?? '—'} max`}
            </p>
            {!smartLocker && locker.contactPhone ? (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>
                Contact : {locker.contactName ? `${locker.contactName} · ` : ''}
                {locker.contactPhone}
              </p>
            ) : null}
            {!smartLocker && locker.notes ? (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', opacity: 0.75 }}>
                {locker.notes}
              </p>
            ) : null}
          </div>
          <LockerStatusToggle
            status={locker.status}
            options={nextLockerStatuses}
            disabled={updatingLocker}
            onChange={(next) => void advanceLockerStatus(next)}
          />
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.borderSubtle}`,
          padding: '1.25rem 0',
          marginBottom: '2rem',
          width: '100%',
          flexWrap: 'wrap',
          gap: '0.5rem 0',
        }}
      >
        {smartLocker ? (
          <>
            <StatItem label="DISPONIBLES" value={locker.compartmentCounts.available} />
            <div style={{ width: 1, height: 32, backgroundColor: colors.borderSubtle, alignSelf: 'center', flexShrink: 0 }} />
            <StatItem label="OCCUPÉS" value={locker.compartmentCounts.occupied} />
            <div style={{ width: 1, height: 32, backgroundColor: colors.borderSubtle, alignSelf: 'center', flexShrink: 0 }} />
            <StatItem label="RÉSERVÉS" value={locker.compartmentCounts.reserved} />
          </>
        ) : (
          <>
            <StatItem label="LIBRES" value={locker.availableSlots} />
            <div style={{ width: 1, height: 32, backgroundColor: colors.borderSubtle, alignSelf: 'center', flexShrink: 0 }} />
            <StatItem label="ASSIGNÉS" value={locker.occupyingCount} />
            <div style={{ width: 1, height: 32, backgroundColor: colors.borderSubtle, alignSelf: 'center', flexShrink: 0 }} />
            <StatItem label="CAPACITÉ" value={locker.maxCapacity ?? '—'} />
          </>
        )}
        <div style={{ width: 1, height: 32, backgroundColor: colors.borderSubtle, alignSelf: 'center', flexShrink: 0 }} />
        <StatItem label="OCCUPATION" value={`${occupancyRate}%`} />
      </div>

      {/* Cabinet + side panel */}
      {smartLocker ? (
      <div
        className="locker-detail-split"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.65fr) minmax(260px, 1fr)',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            boxSizing: 'border-box',
            padding: '1.25rem',
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radius.md,
            background: colors.surface,
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
                  color: colors.textMuted,
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
                  color: colors.secondary,
                }}
              >
                {selectedCompartment.label}
              </p>
              <p
                style={{
                  margin: '0.5rem 0 0.75rem',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  color: colors.textMuted,
                }}
              >
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
                      color: colors.textMuted,
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
                          ...webSecondaryButtonStyle,
                          height: spacing.buttonHeight,
                          padding: '0 1.25rem',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          cursor:
                            updatingCompartmentId === selectedCompartment.id ? 'wait' : 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {COMPARTMENT_STATUS_LABELS[status]}
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
                  color: colors.textMuted,
                  lineHeight: 1.5,
                }}
              >
                Sélectionnez un compartiment
                <br />
                dans la grille
              </p>
            </div>
          )}
        </aside>
      </div>
      ) : (
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, opacity: 0.75 }}>
          Point sans grille matérielle — le retrait se fait en personne via le contact indiqué.
        </p>
      )}
    </div>
  );
}