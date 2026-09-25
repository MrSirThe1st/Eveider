'use client';

import { webCardStyle } from '@eveider/config-ui';
import { Button, InlineAlert, Modal } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { BusinessParcelProgression } from '@/components/business-parcel-progression';
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
import styles from './business-parcel-detail.module.css';

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
  const [labelOpen, setLabelOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isFlow2 = parcel.pickupType === 'merchant_dropoff';
  const methodLabel = getFulfillmentMethodLabel(parcel.pickupType);
  const statusLabel = getBusinessParcelDisplayStatus({
    status: parcel.status,
    pickupType: parcel.pickupType,
    hasAssignedOutboundDelivery: parcel.activeDelivery?.kind === 'outbound',
  });

  const routeParts = [
    isFlow2 ? null : parcel.senderName,
    parcel.locker?.name ?? null,
    parcel.recipientName,
  ].filter(Boolean);
  const routeSummary = routeParts.join(' → ');

  const recipientPaymentDue = parcel.recipientCharges.some((charge) => charge.status === 'owed');
  const hasRecipientPayment =
    parcel.recipientCharges.length > 0 || Boolean(parcel.deliveryFeeLabel);

  const labelData = {
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
    pickupTypeLabel: methodLabel,
    reference: parcel.reference,
  };

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
    <div className={styles.page}>
      {justCreated ? <FlashBanner message={createdMessage} /> : null}

      <section className={styles.card} style={webCardStyle}>
        <div className={styles.headerTop}>
          <div>
            <h2 className={styles.tracking}>{parcel.trackingNumber}</h2>
            <p className={styles.methodChip}>{methodLabel}</p>
          </div>
          <ParcelStatusBadge status={parcel.status} label={statusLabel} />
        </div>
        {routeSummary ? <p className={styles.routeSummary}>{routeSummary}</p> : null}
        <p className={styles.created}>Créé le {formatDateTime(parcel.createdAt)}</p>
      </section>

      <section className={styles.card} style={webCardStyle} aria-label="Progression">
        <BusinessParcelProgression progression={parcel.progression} />
      </section>

      <section className={styles.card} style={webCardStyle}>
        <h3 className={styles.sectionTitle}>Livraison</h3>
        <div className={styles.routeBlock}>
          {!isFlow2 ? (
            <>
              <div className={styles.routeLeg}>
                <p className={styles.routeLegLabel}>Collecte</p>
                <p className={styles.routeLegName}>{parcel.senderName}</p>
                {parcel.senderAddress ? (
                  <p className={styles.routeLegDetail}>{parcel.senderAddress}</p>
                ) : (
                  <p className={styles.routeLegDetail}>Adresse de collecte non renseignée</p>
                )}
                {parcel.senderPhone ? (
                  <p className={styles.routeLegDetail}>{parcel.senderPhone}</p>
                ) : null}
              </div>
              <p className={styles.routeArrow} aria-hidden>
                ↓
              </p>
            </>
          ) : (
            <>
              <div className={styles.routeLeg}>
                <p className={styles.routeLegLabel}>Dépôt</p>
                <p className={styles.routeLegName}>Vous apportez le colis au casier</p>
                <p className={styles.routeLegDetail}>Aucun transport Eveider pour cet envoi.</p>
              </div>
              <p className={styles.routeArrow} aria-hidden>
                ↓
              </p>
            </>
          )}
          <div className={styles.routeLeg}>
            <p className={styles.routeLegLabel}>Destination</p>
            <p className={styles.routeLegName}>{parcel.locker?.name ?? '—'}</p>
            {parcel.locker?.address ? (
              <p className={styles.routeLegDetail}>{parcel.locker.address}</p>
            ) : null}
            {parcel.compartment?.label ? (
              <p className={styles.routeLegDetail}>Compartiment {parcel.compartment.label}</p>
            ) : null}
          </div>
        </div>
        {parcel.activeDelivery && !isFlow2 ? (
          <p className={styles.driverNote}>
            {parcel.activeDelivery.kindLabel} · Chauffeur :{' '}
            {parcel.activeDelivery.driverName ?? '—'} · {parcel.activeDelivery.statusLabel}
          </p>
        ) : null}
      </section>

      {isFlow2 && parcel.status === 'created' ? (
        <section className={styles.card} style={webCardStyle}>
          <h3 className={styles.sectionTitle}>Dépôt au casier</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            Déposez le colis au casier {parcel.locker?.name ?? ''}.
          </p>
          {parcel.locker?.address ? (
            <p className={styles.mutedNote}>{parcel.locker.address}</p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.card} style={webCardStyle}>
        <h3 className={styles.sectionTitle}>Détails</h3>
        <dl className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <dt className={styles.detailLabel}>Destinataire</dt>
            <dd className={styles.detailValue}>{parcel.recipientName ?? '—'}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt className={styles.detailLabel}>Téléphone</dt>
            <dd className={styles.detailValue}>{parcel.recipientPhone}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt className={styles.detailLabel}>Taille</dt>
            <dd className={styles.detailValue}>{parcel.packageSizeLabel}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt className={styles.detailLabel}>Méthode</dt>
            <dd className={styles.detailValue}>{methodLabel}</dd>
          </div>
          {parcel.reference ? (
            <div className={styles.detailItem}>
              <dt className={styles.detailLabel}>Référence</dt>
              <dd className={styles.detailValue}>{parcel.reference}</dd>
            </div>
          ) : null}
          <div className={styles.detailItem}>
            <dt className={styles.detailLabel}>Catégorie</dt>
            <dd className={styles.detailValue}>{parcel.packageCategoryLabel}</dd>
          </div>
        </dl>
      </section>

      {canManageOperations && parcel.canConfirmDeposit ? (
        <section className={styles.card} style={webCardStyle}>
          <h3 className={styles.sectionTitle}>Confirmer le dépôt — mode de secours</h3>
          <p className={styles.mutedNote} style={{ marginTop: 0 }}>
            Solution temporaire tant que le casier n’est pas encore commissionné. La confirmation
            place le colis « Au casier ». Le destinataire n’est prêt au retrait qu’après la
            préparation Eveider.
          </p>
          {depositError ? <InlineAlert message={depositError} variant="error" /> : null}
          <div style={{ marginTop: '0.85rem' }}>
            <Button disabled={depositing} onClick={() => void confirmDeposit()}>
              {depositing ? 'Confirmation…' : 'Confirmer le dépôt — mode de secours'}
            </Button>
          </div>
        </section>
      ) : null}

      {parcel.historicalRts ? (
        <section className={styles.card} style={webCardStyle}>
          <h3 className={styles.sectionTitle}>Retour non retiré (historique)</h3>
          <p className={styles.mutedNote} style={{ marginTop: 0 }}>
            Ancien retour de colis non retiré. Ce n’est pas un retour client.
          </p>
        </section>
      ) : null}

      {parcel.customerReturn ? (
        <section className={styles.card} style={webCardStyle}>
          <h3 className={styles.sectionTitle}>Retour client</h3>
          <p style={{ margin: '0 0 0.35rem', fontSize: 14 }}>
            Processus : {parcel.customerReturn.statusLabel}
            {parcel.customerReturn.methodLabel ? ` · ${parcel.customerReturn.methodLabel}` : ''}
          </p>
          <p className={styles.mutedNote} style={{ marginTop: 0 }}>
            État physique : {statusLabel}
          </p>
          {parcel.customerReturn.requestedAt ? (
            <p className={styles.mutedNote}>
              Demandé le {formatDateTime(parcel.customerReturn.requestedAt)}
            </p>
          ) : null}
          {parcel.status === 'return_at_point' && parcel.customerReturn.method === 'business_pickup' ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: 14 }}>
              Votre entreprise doit récupérer ce retour au casier.
            </p>
          ) : null}
          {parcel.customerReturn.returnLocker ? (
            <p className={styles.mutedNote}>
              Casier de retour : {parcel.customerReturn.returnLocker.name}
            </p>
          ) : null}
          {returnError ? <InlineAlert message={returnError} variant="error" /> : null}
          {canManageOperations && parcel.customerReturn.canApprove ? (
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.85rem' }}>
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
              <p className={styles.mutedNote} style={{ marginTop: 0 }}>
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
            <div style={{ marginTop: '0.85rem' }}>
              <p className={styles.mutedNote} style={{ marginTop: 0, marginBottom: '0.75rem' }}>
                Confirmation manuelle — mode de secours, tant que le casier n’est pas commissionné.
              </p>
              <Button disabled={returnActing} onClick={() => void postReturnAction('pickup')}>
                Confirmer le retrait — mode de secours
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {hasRecipientPayment ? (
        <section className={styles.card} style={webCardStyle}>
          <h3 className={styles.sectionTitle}>Paiement</h3>
          <p className={styles.paymentLead}>À payer par le destinataire</p>
          {parcel.recipientCharges.length > 0 ? (
            <ul className={styles.paymentList}>
              {parcel.recipientCharges.map((charge) => (
                <li key={charge.id} className={styles.paymentRow}>
                  <span>{charge.kindLabel}</span>
                  <strong>{charge.amountLabel}</strong>
                </li>
              ))}
            </ul>
          ) : parcel.deliveryFeeLabel ? (
            <ul className={styles.paymentList}>
              <li className={styles.paymentRow}>
                <span>{isFlow2 ? 'Retrait au casier' : 'Livraison Eveider'}</span>
                <strong>{parcel.deliveryFeeLabel}</strong>
              </li>
            </ul>
          ) : null}
          {recipientPaymentDue ? (
            <p className={styles.paymentConsequence}>Paiement requis avant le retrait.</p>
          ) : (
            <p className={styles.mutedNote}>
              Ces frais ne s’ajoutent pas à ce que votre entreprise doit.
            </p>
          )}
        </section>
      ) : null}

      {parcel.businessCharges.length > 0 ? (
        <section className={styles.card} style={webCardStyle}>
          <h3 className={styles.sectionTitle}>Frais entreprise</h3>
          <ul className={styles.paymentList}>
            {parcel.businessCharges.map((charge) => (
              <li key={charge.id} className={styles.paymentRow}>
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

      <section className={styles.card} style={webCardStyle}>
        <h3 className={styles.sectionTitle}>Étiquette</h3>
        <ShippingLabel
          data={labelData}
          variant="compact"
          onExpand={() => setLabelOpen(true)}
        />
      </section>

      <Modal
        open={labelOpen}
        onClose={() => setLabelOpen(false)}
        title="Étiquette"
        maxWidth={480}
      >
        <ShippingLabel data={labelData} variant="full" printable={false} />
      </Modal>

      {canManageOperations ? <ParcelInvitePanel parcelId={parcel.id} initialInvite={invite} /> : null}

      <p className={styles.footerMeta}>
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

      {canManageOperations ? (
        <>
          <button
            type="button"
            className={styles.reportTrigger}
            onClick={() => setReportOpen(true)}
          >
            Signaler un problème
          </button>
          <Modal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            title="Signaler un problème"
            description="L’équipe Eveider verra ce signalement. Le code PIN n’est jamais affiché ici."
            maxWidth={520}
          >
            <BusinessReportIssue parcelId={parcel.id} initialIssues={issues} />
          </Modal>
        </>
      ) : null}
    </div>
  );
}
