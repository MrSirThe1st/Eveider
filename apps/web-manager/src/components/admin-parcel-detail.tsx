'use client';

import { colors, spacing, borderSubtle, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import {
  adminAdvanceableParcelStatuses,
  type DeliveryKind,
  type DeliveryStatus,
  type ParcelStatus,
} from '@eveider/domain';
import { CardListSkeleton } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { FlashBanner } from '@/components/flash-banner';
import { ParcelEventTimeline } from '@/components/parcel-event-timeline';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import {
  getAdminDeliveryStatusLabel,
  getAdminParcelDisplayStatus,
  getAdminReturnMethodLabel,
  getAdminReturnProcessLabel,
  getFulfillmentMethodLabel,
  isEveiderOutboundTransport,
} from '@/lib/admin-presentation';
import type { AdminParcelChargeDto, AdminParcelEventDto } from '@/lib/parcel-presenter';
import type { ParcelReturnView } from '@/lib/parcel-return-presenter';

type ActiveDelivery = {
  id: string;
  status: DeliveryStatus;
  kind: DeliveryKind;
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
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  business: { id: string; name: string };
  locker: { id: string; name: string; address: string } | null;
  pickupType: 'courier_pickup' | 'merchant_dropoff';
  pickupTypeLabel: string;
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: borderSubtle() }}>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', color: colors.textMuted }}>
        {title}
      </p>
      {children}
    </section>
  );
}

function DriverAssignRow({
  couriers,
  selectedCourierId,
  assigning,
  onSelect,
  onAssign,
  label,
}: {
  couriers: CourierOption[];
  selectedCourierId: string;
  assigning: boolean;
  onSelect: (id: string) => void;
  onAssign: () => void;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
      <select
        value={selectedCourierId}
        onChange={(event) => onSelect(event.target.value)}
        aria-label="Chauffeur Eveider"
        style={{
          ...webInputStyle,
          minWidth: 220,
          height: spacing.buttonHeight,
          padding: '0 0.75rem',
        }}
      >
        <option value="">Sélectionner un chauffeur Eveider</option>
        {couriers.map((courier) => (
          <option key={courier.id} value={courier.id}>
            {courier.fullName ?? courier.email ?? courier.phone ?? courier.id}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={assigning || !selectedCourierId}
        onClick={onAssign}
        style={{
          ...webSecondaryButtonStyle,
          height: spacing.buttonHeight,
          padding: '0 1.25rem',
          fontSize: '0.75rem',
          cursor: assigning || !selectedCourierId ? 'not-allowed' : 'pointer',
        }}
      >
        {label}
      </button>
    </div>
  );
}

type AdminParcelDetailProps = {
  parcelId: string;
};

export function AdminParcelDetail({ parcelId }: AdminParcelDetailProps) {
  const [parcel, setParcel] = useState<ParcelDetailData | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [customerReturn, setCustomerReturn] = useState<ParcelReturnView | null>(null);
  const [charges, setCharges] = useState<AdminParcelChargeDto[]>([]);
  const [events, setEvents] = useState<AdminParcelEventDto[]>([]);
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
      setCustomerReturn(result.data.customerReturn ?? null);
      setCharges(Array.isArray(result.data.charges) ? result.data.charges : []);
      setEvents(Array.isArray(result.data.events) ? result.data.events : []);
    } catch {
      setError('Impossible de charger le colis.');
      setParcel(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadParcel();
    void loadCouriers();
  }, [parcelId]);

  async function assignCourier(kind: 'outbound' | 'customer_return' = 'outbound') {
    if (!selectedCourierId) return;

    setAssigning(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/parcels/${parcelId}/assign-courier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierId: selectedCourierId, kind }),
      });
      const result = await response.json();

      if (!result.success) {
        setActionError(result.error ?? 'Assignation échouée');
        return;
      }

      setSuccessMessage(
        kind === 'customer_return'
          ? 'Chauffeur Eveider assigné au retour client'
          : 'Chauffeur Eveider assigné à l’aller',
      );
      setSelectedCourierId('');
      await loadParcel();
    } catch {
      setActionError('Impossible d’assigner le chauffeur Eveider.');
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

      setSuccessMessage(
        `Mode de secours : ${getAdminParcelDisplayStatus({
          status: nextStatus,
          pickupType: parcel.pickupType,
        })}`,
      );
      await loadParcel();
    } catch {
      setActionError('Impossible de mettre à jour le statut.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <CardListSkeleton cards={2} />;
  }

  if (error || !parcel) {
    return (
      <div>
        <p style={{ fontWeight: 500, color: colors.danger }}>{error ?? 'Colis introuvable'}</p>
        <Link href="/tableau-de-bord/colis" style={{ fontWeight: 600 }}>
          ← Retour aux colis
        </Link>
      </div>
    );
  }

  const isFlow2 = parcel.pickupType === 'merchant_dropoff';
  const nextStatuses = adminAdvanceableParcelStatuses(parcel.status).filter((status) => {
    if (isFlow2 && status === 'in_transit') return false;
    return true;
  });
  const displayStatus = getAdminParcelDisplayStatus({
    status: parcel.status,
    pickupType: parcel.pickupType,
    hasAssignedOutboundDelivery: activeDelivery?.kind === 'outbound',
  });
  const methodLabel = parcel.pickupTypeLabel || getFulfillmentMethodLabel(parcel.pickupType);
  const showOutboundAssign =
    isEveiderOutboundTransport(parcel.pickupType) &&
    !activeDelivery &&
    (parcel.status === 'created' || parcel.status === 'in_transit');
  const showReturnAssign =
    Boolean(customerReturn?.canAssignDriver) &&
    (!activeDelivery || activeDelivery.kind !== 'customer_return');
  const isBusinessPickupReturn = customerReturn?.method === 'business_pickup';

  return (
    <div style={{ width: '100%' }}>
      {successMessage ? <FlashBanner message={successMessage} /> : null}
      {actionError ? <FlashBanner message={actionError} variant="error" /> : null}

      <section style={{ ...webCardStyle, padding: '1.5rem 2rem' }}>
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
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              {parcel.trackingNumber}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: colors.textMuted }}>
              {parcel.business.name}
              {parcel.reference ? ` · Réf. ${parcel.reference}` : ''}
            </p>
          </div>
          <ParcelStatusBadge status={parcel.status} label={displayStatus} />
        </div>

        <dl
          style={{
            margin: '1.5rem 0 0',
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.textMuted }}>Destinataire</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.recipientName ?? '—'}
              <br />
              <span style={{ fontSize: '0.8125rem', color: colors.textMuted }}>
                {parcel.recipientPhone}
              </span>
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.textMuted }}>Créé</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{formatDateTime(parcel.createdAt)}</dd>
          </div>
        </dl>

        <Section title="Exécution">
          <p style={{ margin: 0, fontWeight: 600 }}>{methodLabel}</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
            {parcel.locker ? (
              <>
                Casier :{' '}
                <Link href={`/tableau-de-bord/casiers/${parcel.locker.id}`}>
                  {parcel.locker.name}
                </Link>
                <br />
                <span style={{ color: colors.textMuted }}>{parcel.locker.address}</span>
              </>
            ) : (
              'Casier non assigné'
            )}
          </p>
        </Section>

        <Section title="État du colis">
          <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{displayStatus}</p>
        </Section>

        <Section title="Livraison">
          {activeDelivery ? (
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {activeDelivery.kind === 'customer_return'
                  ? 'Livraison retour client'
                  : 'Livraison aller'}
              </p>
              <p style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
                Chauffeur Eveider :{' '}
                {activeDelivery.courier.fullName ?? activeDelivery.courier.email ?? 'Chauffeur'}
              </p>
              <div style={{ marginTop: '0.5rem' }}>
                <DeliveryStatusBadge
                  status={activeDelivery.status}
                  label={getAdminDeliveryStatusLabel(activeDelivery.status)}
                />
              </div>
            </div>
          ) : showOutboundAssign ? (
            <DriverAssignRow
              couriers={couriers}
              selectedCourierId={selectedCourierId}
              assigning={assigning}
              onSelect={setSelectedCourierId}
              onAssign={() => void assignCourier('outbound')}
              label="Assigner l’aller"
            />
          ) : isFlow2 ? (
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
              Aucun transport Eveider — dépôt effectué par l’entreprise.
            </p>
          ) : isBusinessPickupReturn ? (
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
              Retrait par l’entreprise — aucun transport Eveider.
            </p>
          ) : (
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
              Aucune livraison Eveider en cours.
            </p>
          )}
        </Section>

        {parcel.locker ? (
          <Section title="Casier">
            <p style={{ margin: 0, fontWeight: 500 }}>
              <Link href={`/tableau-de-bord/casiers/${parcel.locker.id}`}>{parcel.locker.name}</Link>
            </p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: colors.textMuted }}>
              {parcel.locker.address}
            </p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
              Placement actuel : {displayStatus}
            </p>
          </Section>
        ) : null}

        {customerReturn ? (
          <Section title="Retour client">
            <p style={{ margin: 0, fontWeight: 600 }}>
              {getAdminReturnProcessLabel(customerReturn.status)}
              {getAdminReturnMethodLabel(customerReturn.method)
                ? ` · ${getAdminReturnMethodLabel(customerReturn.method)}`
                : ''}
            </p>
            {customerReturn.returnLocker ? (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
                Casier de retour : {customerReturn.returnLocker.name}
              </p>
            ) : null}
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
              Demandé le {formatDateTime(customerReturn.requestedAt)}
              {customerReturn.authorizedAt
                ? ` · Autorisé le ${formatDateTime(customerReturn.authorizedAt)}`
                : ''}
            </p>
            {isBusinessPickupReturn ? (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>Retrait par l’entreprise</p>
            ) : null}
            {showReturnAssign ? (
              <div style={{ marginTop: '0.75rem' }}>
                <DriverAssignRow
                  couriers={couriers}
                  selectedCourierId={selectedCourierId}
                  assigning={assigning}
                  onSelect={setSelectedCourierId}
                  onAssign={() => void assignCourier('customer_return')}
                  label="Assigner le retour client"
                />
              </div>
            ) : null}
          </Section>
        ) : null}

        {charges.length > 0 ? (
          <Section title="Charges">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
              {charges.map((charge) => (
                <li key={charge.id} style={{ fontSize: '0.875rem' }}>
                  <strong>{charge.kindLabel}</strong>
                  {' · '}
                  {charge.amountLabel}
                  {' · Payé par '}
                  {charge.payerLabel}
                  {charge.historical ? (
                    <span style={{ color: colors.textMuted }}> · historique</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {nextStatuses.length > 0 ? (
          <Section title="Mode de secours">
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: colors.textMuted }}>
              Action opérationnelle — ne remplace pas le dépôt ou le retrait au casier.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updating}
                  onClick={() => void advanceStatus(status)}
                  style={{
                    ...webSecondaryButtonStyle,
                    height: spacing.buttonHeight,
                    padding: '0 1.25rem',
                    fontSize: '0.75rem',
                    cursor: updating ? 'wait' : 'pointer',
                    opacity: 0.85,
                  }}
                >
                  {`Forcer : ${
                    status === 'ready_for_pickup'
                      ? 'prêt au retrait'
                      : getAdminParcelDisplayStatus({ status, pickupType: parcel.pickupType })
                  }`}
                </button>
              ))}
            </div>
          </Section>
        ) : null}
      </section>

      <ParcelEventTimeline
        events={events}
        parcelStatusLabel={(status) =>
          getAdminParcelDisplayStatus({ status, pickupType: parcel.pickupType })
        }
        deliveryStatusLabel={getAdminDeliveryStatusLabel}
      />
    </div>
  );
}
