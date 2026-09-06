'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import { Button, InlineAlert } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { BusinessReportIssue } from '@/components/business-report-issue';
import { BusinessParcelLocationBadge } from '@/components/business-parcel-location-badge';
import {
  BusinessParcelProgression,
} from '@/components/business-parcel-progression';
import { ParcelInvitePanel } from '@/components/parcel-invite-panel';
import { BusinessAssignCourier } from '@/components/business-assign-courier';
import { ParcelEventTimeline } from '@/components/parcel-event-timeline';
import { ShippingLabel } from '@/components/shipping-label';
import type { AssignableCourierView } from '@/server/couriers';
import type { IssueItem } from '@/server/issues';
import type { BusinessParcelDetailView, ParcelInviteView } from '@/server/parcels';

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type ParcelDetailProps = {
  parcel: BusinessParcelDetailView;
  justCreated?: boolean;
  canManageOperations?: boolean;
  canAssignCouriers?: boolean;
  assignableCouriers?: AssignableCourierView[];
  invite?: ParcelInviteView | null;
  issues?: IssueItem[];
};

export function BusinessParcelDetail({
  parcel,
  justCreated = false,
  canManageOperations = false,
  canAssignCouriers = false,
  assignableCouriers = [],
  invite = null,
  issues = [],
}: ParcelDetailProps) {
  const router = useRouter();
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositing, setDepositing] = useState(false);

  async function confirmDeposit() {
    setDepositing(true);
    setDepositError(null);
    try {
      const response = await fetch(`/api/organisation/parcels/${parcel.id}/confirm-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compartmentId: parcel.compartment?.id,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setDepositError(result.error ?? 'Dépôt impossible');
        return;
      }
      router.refresh();
    } catch {
      setDepositError('Erreur réseau');
    } finally {
      setDepositing(false);
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {justCreated ? (
        <FlashBanner message={`Colis ${parcel.trackingNumber} créé avec succès.`} />
      ) : null}

      <section
        style={{
          ...webCardStyle,
          padding: '2rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            {parcel.trackingNumber}
          </h2>
          <BusinessParcelLocationBadge location={parcel.location} />
        </div>

        <dl style={{ margin: '2rem 0 0', display: 'grid', gap: '1.25rem' }}>
          {parcel.reference ? (
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>
                Réf. marchande
              </dt>
              <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{parcel.reference}</dd>
            </div>
          ) : null}
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Collecte</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{parcel.pickupTypeLabel}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Expéditeur</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.senderName} · {parcel.senderPhone}
              {parcel.senderAddress ? (
                <>
                  <br />
                  <span style={{ fontSize: '0.875rem' }}>{parcel.senderAddress}</span>
                </>
              ) : null}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Destinataire</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.recipientName ?? '—'} · {parcel.recipientPhone}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>
              Point de retrait
            </dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.locker ? (
                <>
                  {parcel.locker.name}
                  <br />
                  <span style={{ fontSize: '0.875rem' }}>{parcel.locker.address}</span>
                  {parcel.compartment ? (
                    <>
                      <br />
                      <span style={{ fontSize: '0.875rem' }}>
                        Compartiment {parcel.compartment.label}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
          {parcel.deliveryFeeLabel ? (
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>
                {parcel.pickupType === 'merchant_dropoff' ? 'Frais de dépôt' : 'Frais de livraison'}
              </dt>
              <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{parcel.deliveryFeeLabel}</dd>
            </div>
          ) : parcel.pickupType === 'merchant_dropoff' && parcel.status === 'created' ? (
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>
                Frais de dépôt
              </dt>
              <dd style={{ margin: '0.35rem 0 0', fontWeight: 500, color: colors.textMuted }}>
                Facturés à la confirmation du dépôt
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <BusinessParcelProgression steps={parcel.progression} />

      {canManageOperations && parcel.canConfirmDeposit ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginTop: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Confirmer le dépôt</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: 14, color: colors.textMuted }}>
            Le colis est au point Eveider. La confirmation le rend prêt au retrait et facture le
            frais de dépôt.
          </p>
          {depositError ? <InlineAlert message={depositError} variant="error" /> : null}
          <Button disabled={depositing} onClick={() => void confirmDeposit()}>
            {depositing ? 'Confirmation…' : 'Confirmer le dépôt au point'}
          </Button>
        </section>
      ) : null}

      {parcel.charges.length > 0 ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginTop: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Frais entreprise</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
            {parcel.charges.map((charge) => (
              <li
                key={charge.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  fontSize: 14,
                }}
              >
                <span>
                  {charge.kindLabel}
                  {charge.kind === 'locker_rental' && charge.quantity != null
                    ? ` · ${charge.quantity} × 24 h`
                    : ''}
                  {charge.status === 'pending' ? ' (en cours)' : ''}
                </span>
                <strong>{charge.amountLabel}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section style={{ ...webCardStyle, padding: '1.5rem', marginTop: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Étiquette</h3>
        <ShippingLabel
          data={{
            trackingNumber: parcel.trackingNumber,
            senderName: parcel.senderName,
            senderPhone: parcel.senderPhone,
            senderAddress: parcel.senderAddress,
            recipientName: parcel.recipientName,
            recipientPhone: parcel.recipientPhone,
            lockerName: parcel.locker?.name ?? null,
            lockerAddress: parcel.locker?.address ?? null,
            compartmentLabel: parcel.compartment?.label ?? null,
            packageSizeLabel: parcel.packageSizeLabel,
            packageCategoryLabel: parcel.packageCategoryLabel,
            paymentResponsibilityLabel: parcel.paymentResponsibilityLabel,
            pickupTypeLabel: parcel.pickupTypeLabel,
            reference: parcel.reference,
          }}
        />
      </section>

      {canAssignCouriers && parcel.canAssignOutbound ? (
        <BusinessAssignCourier parcelId={parcel.id} couriers={assignableCouriers} />
      ) : null}

      {canAssignCouriers && parcel.canCreateReturn ? (
        <BusinessAssignCourier
          parcelId={parcel.id}
          couriers={assignableCouriers}
          kind="return"
          title="Créer un retour"
          buttonLabel="Créer le retour"
        />
      ) : null}

      {canManageOperations ? (
        <ParcelInvitePanel parcelId={parcel.id} initialInvite={invite} />
      ) : null}

      {canManageOperations ? (
        <section style={{ ...webCardStyle, padding: '1.5rem', marginTop: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Signalement</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: colors.textMuted }}>
            Un incident est visible par les opérations Eveider. Le code PIN client n’est jamais
            affiché ici.
          </p>
          <BusinessReportIssue parcelId={parcel.id} initialIssues={issues} />
        </section>
      ) : null}

      <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
        Mis à jour le {formatDateTime(parcel.updatedAt)}
        {parcel.readyForPickupAt
          ? ` · Prêt depuis le ${formatDateTime(parcel.readyForPickupAt)}`
          : ''}
      </p>

      <ParcelEventTimeline events={parcel.events} compact />
    </div>
  );
}
