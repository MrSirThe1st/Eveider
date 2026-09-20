'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import { Button, InlineAlert } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { BusinessReportIssue } from '@/components/business-report-issue';
import { ParcelInvitePanel } from '@/components/parcel-invite-panel';
import { ParcelEventTimeline } from '@/components/parcel-event-timeline';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import { ShippingLabel } from '@/components/shipping-label';
import {
  getBusinessDeliveryStatusLabel,
  getBusinessParcelDisplayStatus,
  getFulfillmentMethodLabel,
} from '@/lib/business-presentation';
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
  invite?: ParcelInviteView | null;
  issues?: IssueItem[];
};

export function BusinessParcelDetail({
  parcel,
  justCreated = false,
  canManageOperations = false,
  invite = null,
  issues = [],
}: ParcelDetailProps) {
  const router = useRouter();
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnActing, setReturnActing] = useState(false);
  const [returnMethod, setReturnMethod] = useState<'eveider_return' | 'business_pickup'>(
    'eveider_return',
  );
  const [returnLockerId, setReturnLockerId] = useState(parcel.returnLockerOptions[0]?.id ?? '');
  const [returnQuoteLabel, setReturnQuoteLabel] = useState<string | null>(null);

  const isFlow2 = parcel.pickupType === 'merchant_dropoff';
  const statusLabel = getBusinessParcelDisplayStatus({
    status: parcel.status,
    pickupType: parcel.pickupType,
    hasAssignedOutboundDelivery: parcel.activeDelivery?.kind === 'outbound',
  });

  useEffect(() => {
    if (!parcel.customerReturn?.canApprove || !returnLockerId) {
      setReturnQuoteLabel(null);
      return;
    }
    const params = new URLSearchParams({ method: returnMethod, returnLockerId });
    let cancelled = false;
    void fetch(`/api/organisation/return-quote?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setReturnQuoteLabel(json.data.feeLabel as string);
        }
      })
      .catch(() => {
        if (!cancelled) setReturnQuoteLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [parcel.customerReturn?.canApprove, returnLockerId, returnMethod]);

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

  async function postReturnAction(path: string, body?: Record<string, unknown>) {
    setReturnActing(true);
    setReturnError(null);
    try {
      const response = await fetch(`/api/organisation/parcels/${parcel.id}/return/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const result = await response.json();
      if (!result.success) {
        setReturnError(result.error ?? 'Action impossible');
        return;
      }
      router.refresh();
    } catch {
      setReturnError('Erreur réseau');
    } finally {
      setReturnActing(false);
    }
  }

  const createdMessage = isFlow2
    ? `Colis créé. Déposez maintenant le colis au casier ${parcel.locker?.name ?? ''}.`
    : 'Colis créé. Eveider doit maintenant organiser la collecte auprès de votre entreprise.';

  return (
    <div style={{ width: '100%' }}>
      {justCreated ? <FlashBanner message={createdMessage} /> : null}

      <section style={{ ...webCardStyle, padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{parcel.trackingNumber}</h2>
          <ParcelStatusBadge status={parcel.status} label={statusLabel} />
        </div>
        <dl style={{ margin: '1.5rem 0 0', display: 'grid', gap: '1rem' }}>
          {parcel.reference ? (
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Référence</dt>
              <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{parcel.reference}</dd>
            </div>
          ) : null}
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Destinataire</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.recipientName ?? '—'} · {parcel.recipientPhone}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Créé</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>{formatDateTime(parcel.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Méthode</h3>
        <p style={{ margin: 0, fontWeight: 600 }}>{getFulfillmentMethodLabel(parcel.pickupType)}</p>
        {isFlow2 ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: 14, color: colors.textMuted }}>
            Aucun transport Eveider. Vous apportez ce colis au casier.
          </p>
        ) : (
          <p style={{ margin: '0.5rem 0 0', fontSize: 14, color: colors.textMuted }}>
            Un chauffeur Eveider vient récupérer le colis auprès de votre entreprise.
          </p>
        )}
      </section>

      {parcel.activeDelivery && !isFlow2 ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
            {parcel.activeDelivery.kindLabel}
          </h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            Chauffeur Eveider : {parcel.activeDelivery.driverName ?? '—'}
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: 14, color: colors.textMuted }}>
            État : {parcel.activeDelivery.statusLabel}
          </p>
        </section>
      ) : null}

      {isFlow2 && parcel.status === 'created' ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Dépôt au casier</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            Déposez le colis au casier {parcel.locker?.name ?? ''}.
          </p>
          {parcel.locker?.address ? (
            <p style={{ margin: '0.35rem 0 0', fontSize: 14, color: colors.textMuted }}>
              {parcel.locker.address}
            </p>
          ) : null}
        </section>
      ) : null}

      <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Casier</h3>
        {parcel.locker ? (
          <>
            <p style={{ margin: 0, fontWeight: 600 }}>{parcel.locker.name}</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: 14, color: colors.textMuted }}>
              {parcel.locker.address}
            </p>
          </>
        ) : (
          <p style={{ margin: 0, color: colors.textMuted }}>—</p>
        )}
      </section>

      {canManageOperations && parcel.canConfirmDeposit ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
            Confirmer le dépôt — mode de secours
          </h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: 14, color: colors.textMuted }}>
            Solution temporaire tant que le casier n’est pas encore commissionné. La confirmation
            place le colis « Au casier ». Le destinataire n’est prêt au retrait qu’après la
            préparation Eveider.
          </p>
          {depositError ? <InlineAlert message={depositError} variant="error" /> : null}
          <Button disabled={depositing} onClick={() => void confirmDeposit()}>
            {depositing ? 'Confirmation…' : 'Confirmer le dépôt — mode de secours'}
          </Button>
        </section>
      ) : null}

      {parcel.historicalRts ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Retour non retiré (historique)</h3>
          <p style={{ margin: '0.5rem 0 0', fontSize: 14, color: colors.textMuted }}>
            Ancien retour de colis non retiré. Ce n’est pas un retour client.
          </p>
        </section>
      ) : null}

      {parcel.customerReturn ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Retour client</h3>
          <p style={{ margin: '0 0 0.35rem', fontSize: 14 }}>
            Processus : {parcel.customerReturn.statusLabel}
            {parcel.customerReturn.methodLabel ? ` · ${parcel.customerReturn.methodLabel}` : ''}
          </p>
          <p style={{ margin: '0 0 0.75rem', fontSize: 14, color: colors.textMuted }}>
            État physique : {statusLabel}
          </p>
          {parcel.customerReturn.requestedAt ? (
            <p style={{ margin: '0 0 0.75rem', fontSize: 13, color: colors.textMuted }}>
              Demandé le {formatDateTime(parcel.customerReturn.requestedAt)}
            </p>
          ) : null}
          {parcel.status === 'return_at_point' && parcel.customerReturn.method === 'business_pickup' ? (
            <p style={{ margin: '0 0 0.75rem', fontSize: 14 }}>
              Votre entreprise doit récupérer ce retour au casier.
            </p>
          ) : null}
          {parcel.customerReturn.returnLocker ? (
            <p style={{ margin: '0 0 0.75rem', fontSize: 14, color: colors.textMuted }}>
              Casier de retour : {parcel.customerReturn.returnLocker.name}
            </p>
          ) : null}
          {returnError ? <InlineAlert message={returnError} variant="error" /> : null}
          {canManageOperations && parcel.customerReturn.canApprove ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{ fontSize: 13 }}>
                Méthode
                <select
                  value={returnMethod}
                  onChange={(event) =>
                    setReturnMethod(event.target.value as 'eveider_return' | 'business_pickup')
                  }
                  style={{ display: 'block', marginTop: 4, width: '100%', minHeight: 40 }}
                >
                  <option value="eveider_return">Retour Eveider</option>
                  <option value="business_pickup">Retrait par l’entreprise</option>
                </select>
              </label>
              <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>
                {returnMethod === 'eveider_return'
                  ? 'Le destinataire dépose le retour au casier. Eveider le ramène ensuite à votre entreprise.'
                  : 'Le destinataire dépose le retour au casier. Votre entreprise vient le récupérer.'}
              </p>
              <label style={{ fontSize: 13 }}>
                Casier de retour
                <select
                  value={returnLockerId}
                  onChange={(event) => setReturnLockerId(event.target.value)}
                  style={{ display: 'block', marginTop: 4, width: '100%', minHeight: 40 }}
                >
                  {parcel.returnLockerOptions.map((locker) => (
                    <option key={locker.id} value={locker.id}>
                      {locker.name}
                    </option>
                  ))}
                </select>
              </label>
              {returnQuoteLabel ? (
                <p style={{ margin: 0, fontSize: 14 }}>
                  {returnMethod === 'eveider_return' ? 'Retour Eveider' : 'Retrait par l’entreprise'} :{' '}
                  {returnQuoteLabel} · Payé par votre entreprise
                </p>
              ) : null}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button
                  disabled={returnActing || !returnLockerId}
                  onClick={() =>
                    void postReturnAction('authorize', {
                      method: returnMethod,
                      returnLockerId,
                    })
                  }
                >
                  Autoriser
                </Button>
                <Button disabled={returnActing} onClick={() => void postReturnAction('reject')}>
                  Refuser
                </Button>
              </div>
            </div>
          ) : null}
          {canManageOperations && parcel.customerReturn.canConfirmPickup ? (
            <div>
              <p style={{ margin: '0 0 0.75rem', fontSize: 13, color: colors.textMuted }}>
                Confirmation manuelle — mode de secours, tant que le casier n’est pas commissionné.
              </p>
              <Button disabled={returnActing} onClick={() => void postReturnAction('pickup')}>
                Confirmer le retrait — mode de secours
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {parcel.recipientCharges.length > 0 ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Frais destinataire</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
            {parcel.recipientCharges.map((charge) => (
              <li key={charge.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>{charge.kindLabel}</span>
                <strong>{charge.amountLabel}</strong>
              </li>
            ))}
          </ul>
          <p style={{ margin: '0.75rem 0 0', fontSize: 12, color: colors.textMuted }}>
            À titre d’information — ces montants ne s’ajoutent pas à ce que votre entreprise doit.
          </p>
        </section>
      ) : parcel.deliveryFeeLabel ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Frais destinataire</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            {isFlow2 ? 'Frais de retrait' : 'Frais de livraison'} : {parcel.deliveryFeeLabel}
          </p>
        </section>
      ) : null}

      {parcel.businessCharges.length > 0 ? (
        <section style={{ ...webCardStyle, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Frais entreprise</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
            {parcel.businessCharges.map((charge) => (
              <li key={charge.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
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

      <section style={{ ...webCardStyle, padding: '1.5rem', marginBottom: '1.25rem' }}>
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
            pickupTypeLabel: getFulfillmentMethodLabel(parcel.pickupType),
            reference: parcel.reference,
          }}
        />
      </section>

      {canManageOperations ? <ParcelInvitePanel parcelId={parcel.id} initialInvite={invite} /> : null}

      {canManageOperations ? (
        <section style={{ ...webCardStyle, padding: '1.5rem', marginTop: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Signaler un problème</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: colors.textMuted }}>
            L’équipe Eveider verra ce signalement. Le code PIN n’est jamais affiché ici.
          </p>
          <BusinessReportIssue parcelId={parcel.id} initialIssues={issues} />
        </section>
      ) : null}

      <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
        Mis à jour le {formatDateTime(parcel.updatedAt)}
        {parcel.readyForPickupAt ? ` · Prêt depuis le ${formatDateTime(parcel.readyForPickupAt)}` : ''}
      </p>

      <ParcelEventTimeline
        events={parcel.events}
        compact
        parcelStatusLabel={(status) =>
          getBusinessParcelDisplayStatus({ status, pickupType: parcel.pickupType })
        }
        deliveryStatusLabel={getBusinessDeliveryStatusLabel}
      />
    </div>
  );
}
