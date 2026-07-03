'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import {
  DELIVERY_STATUS_LABELS,
  PARCEL_STATUS_LABELS,
  PARCEL_STATUSES,
  canTransitionParcel,
  type DeliveryStatus,
  type ParcelStatus,
} from '@eveider/domain';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';

type ActiveDelivery = {
  id: string;
  status: DeliveryStatus;
  courier: { id: string; fullName: string | null; email: string | null };
  createdAt: string;
};

type CourierOption = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
};

type ParcelDetailData = {
  id: string;
  reference: string;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  business: { id: string; name: string };
  locker: { id: string; name: string; address: string } | null;
  createdAt: string;
  updatedAt: string;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function getNextStatuses(current: ParcelStatus): ParcelStatus[] {
  return PARCEL_STATUSES.filter((status) => canTransitionParcel(current, status));
}

type AdminParcelDetailProps = {
  parcelId: string;
};

export function AdminParcelDetail({ parcelId }: AdminParcelDetailProps) {
  const [parcel, setParcel] = useState<ParcelDetailData | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadCouriers() {
    const response = await fetch('/api/couriers', { cache: 'no-store' });
    const result = await response.json();
    if (result.success) {
      setCouriers(result.data.couriers);
    }
  }

  async function loadParcel() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/parcels/${parcelId}`, { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Colis introuvable');
        setParcel(null);
        return;
      }

      setParcel(result.data.parcel);
      setActiveDelivery(result.data.activeDelivery ?? null);
    } catch {
      setError('Impossible de charger le colis.');
      setParcel(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadParcel();
    void loadCouriers();
  }, [parcelId]);

  async function assignCourier() {
    if (!selectedCourierId) return;

    setAssigning(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/parcels/${parcelId}/assign-courier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierId: selectedCourierId }),
      });
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Assignation échouée');
        return;
      }

      setSuccessMessage('Coursier assigné');
      setSelectedCourierId('');
      await loadParcel();
    } catch {
      setActionError('Impossible d’assigner le coursier.');
    } finally {
      setAssigning(false);
    }
  }

  async function advanceStatus(nextStatus: ParcelStatus) {
    if (!parcel) return;

    setUpdating(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/parcels/${parcelId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Mise à jour échouée');
        return;
      }

      setParcel(result.data.parcel);
      setSuccessMessage(`Statut mis à jour : ${PARCEL_STATUS_LABELS[nextStatus]}`);
    } catch {
      setActionError('Impossible de mettre à jour le statut.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <p style={{ fontWeight: 500 }}>Chargement…</p>;
  }

  if (error || !parcel) {
    return (
      <div>
        <p style={{ fontWeight: 500, color: colors.danger }}>{error ?? 'Colis introuvable'}</p>
        <Link href="/tableau-de-bord" style={{ fontWeight: 600 }}>
          ← Retour aux colis
        </Link>
      </div>
    );
  }

  const nextStatuses = getNextStatuses(parcel.status);

  return (
    <div style={{ maxWidth: 720 }}>
      {successMessage ? <FlashBanner message={successMessage} /> : null}
      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

      <Link
        href="/tableau-de-bord"
        style={{
          display: 'inline-block',
          marginBottom: '1.5rem',
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.04em',
          color: colors.secondary,
          textDecoration: 'none',
        }}
      >
        ← RETOUR AUX COLIS
      </Link>

      <section
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.card,
          padding: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            {parcel.reference}
          </h2>
          <ParcelStatusBadge status={parcel.status} />
        </div>

        <dl style={{ margin: '2rem 0 0', display: 'grid', gap: '1.25rem' }}>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              ENTREPRISE
            </dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{parcel.business.name}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              DESTINATAIRE
            </dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.recipientName ?? '—'} · {parcel.recipientPhone}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              CASIER DE DESTINATION
            </dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.locker ? (
                <>
                  {parcel.locker.name}
                  <br />
                  <span style={{ fontSize: '0.875rem' }}>{parcel.locker.address}</span>
                </>
              ) : (
                'Non assigné'
              )}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>CRÉÉ LE</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{formatDateTime(parcel.createdAt)}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              DERNIÈRE MISE À JOUR
            </dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{formatDateTime(parcel.updatedAt)}</dd>
          </div>
        </dl>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${colors.border}` }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
            LIVRAISON COURSIER
          </p>
          {activeDelivery ? (
            <p style={{ margin: 0, fontWeight: 500 }}>
              {activeDelivery.courier.fullName ?? activeDelivery.courier.email ?? 'Coursier'} —{' '}
              {DELIVERY_STATUS_LABELS[activeDelivery.status]}
            </p>
          ) : parcel.locker && (parcel.status === 'created' || parcel.status === 'in_transit') ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <select
                value={selectedCourierId}
                onChange={(event) => setSelectedCourierId(event.target.value)}
                style={{
                  minWidth: 220,
                  height: spacing.buttonHeight,
                  padding: '0 0.75rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.button,
                  fontWeight: 500,
                }}
              >
                <option value="">Sélectionner un coursier</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.fullName ?? courier.email ?? courier.phone ?? courier.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={assigning || !selectedCourierId}
                onClick={() => void assignCourier()}
                style={{
                  height: spacing.buttonHeight,
                  padding: '0 1.25rem',
                  background: colors.primary,
                  color: colors.secondary,
                  border: 'none',
                  borderRadius: radius.button,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  letterSpacing: '0.04em',
                  cursor: assigning || !selectedCourierId ? 'not-allowed' : 'pointer',
                }}
              >
                ASSIGNER
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
              Aucune livraison active.
            </p>
          )}
        </div>

        {nextStatuses.length > 0 ? (
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${colors.border}` }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              AVANCER LE STATUT
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updating}
                  onClick={() => void advanceStatus(status)}
                  style={{
                    height: spacing.buttonHeight,
                    padding: '0 1.25rem',
                    background: colors.primary,
                    color: colors.secondary,
                    border: 'none',
                    borderRadius: radius.button,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em',
                    cursor: updating ? 'wait' : 'pointer',
                  }}
                >
                  → {PARCEL_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ margin: '2rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
            Cycle de vie terminé — aucune transition disponible.
          </p>
        )}
      </section>
    </div>
  );
}
