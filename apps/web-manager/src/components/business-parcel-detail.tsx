import { colors, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { FlashBanner } from '@/components/flash-banner';
import { BusinessReportIssue } from '@/components/business-report-issue';
import { BusinessParcelLocationBadge } from '@/components/business-parcel-location-badge';
import {
  BusinessParcelProgression,
  locationStatusCopy,
} from '@/components/business-parcel-progression';
import { ParcelInvitePanel } from '@/components/parcel-invite-panel';
import { ShippingLabel } from '@/components/shipping-label';
import { WEB_ROUTES } from '@/lib/auth-routing';
import type { BusinessParcelDetailView } from '@/server/parcels';

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
};

export function BusinessParcelDetail({ parcel, justCreated = false }: ParcelDetailProps) {
  const collection = locationStatusCopy(parcel.location);

  return (
    <div style={{ width: '100%' }}>
      {justCreated ? (
        <FlashBanner message={`Colis ${parcel.trackingNumber} créé avec succès.`} />
      ) : null}
      <Link
        href={WEB_ROUTES.businessParcels}
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
        ← Retour aux colis
      </Link>

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
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Enlèvement</dt>
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
              Point de destination
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
          {parcel.compartment ? (
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>
                Compartiment réservé
              </dt>
              <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
                {parcel.compartment.label} — {parcel.compartment.sizeLabel}
              </dd>
            </div>
          ) : null}
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Colis</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.packageSizeLabel} · {parcel.packageCategoryLabel}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Paiement</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {parcel.paymentResponsibilityLabel}
            </dd>
          </div>
          {parcel.deliveryFeeLabel ? (
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>
                Frais de livraison
              </dt>
              <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
                {parcel.deliveryFeeLabel}
                {parcel.deliveryDistanceKm != null ? (
                  <>
                    <br />
                    <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>
                      {parcel.deliveryDistanceKm.toLocaleString('fr-CD')} km
                      {parcel.pricingSizeLabel ? ` · ${parcel.pricingSizeLabel}` : ''}
                    </span>
                  </>
                ) : null}
              </dd>
            </div>
          ) : null}
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.7 }}>Créé le</dt>
            <dd style={{ margin: '0.35rem 0 0', fontWeight: 500 }}>
              {formatDateTime(parcel.createdAt)}
            </dd>
          </div>
        </dl>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <section style={{ ...webCardStyle, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Progression</h3>
          <BusinessParcelProgression steps={parcel.progression} />
        </section>
        <section style={{ ...webCardStyle, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>
            {collection.title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: colors.textMuted }}>
            {collection.body}
          </p>
        </section>
      </div>

      <section style={{ ...webCardStyle, padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
          QR & étiquette
        </h3>
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

      <ParcelInvitePanel parcelId={parcel.id} />

      <section style={{ ...webCardStyle, padding: '1.5rem', marginTop: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
          Signalement
        </h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: colors.textMuted }}>
          Un incident est visible par les opérations Eveider. Le code PIN client n’est jamais affiché ici.
        </p>
        <BusinessReportIssue parcelId={parcel.id} />
      </section>
    </div>
  );
}
