import { colors } from '@eveider/config-ui';
import {
  formatDeliveryFee,
  type DeliveryPricingCurrency,
  type ParcelChargeKind,
  type ParcelChargeStatus,
} from '@eveider/domain';
import Link from 'next/link';
import {
  getBusinessBillingChargeStatusLabel,
  getBusinessBillingHistoryDescription,
} from '@/lib/business-presentation';
import { businessParcelPath } from '@/lib/auth-routing';
import { SettingsFormSection } from '@/components/ops-ui';

type OwedCharge = {
  id: string;
  kind: ParcelChargeKind;
  amount: number;
  currency: DeliveryPricingCurrency;
};

type HistoryCharge = {
  id: string;
  kind: ParcelChargeKind;
  amount: number;
  currency: DeliveryPricingCurrency;
  status: ParcelChargeStatus;
  quantity: number | null;
  createdAt: string;
  parcelId: string;
  parcelLabel: string;
};

type BillingFormProps = {
  pickupHoldHours: number;
  lockerRentalRateAmount: number;
  pricingCurrency: DeliveryPricingCurrency;
  owedCharges: OwedCharge[];
  billingHistory: HistoryCharge[];
};

const dateFormatter = new Intl.DateTimeFormat('fr-CD', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function isReturnKind(kind: ParcelChargeKind): boolean {
  return kind === 'return_delivery' || kind === 'return_locker';
}

export function BusinessBillingForm({
  pickupHoldHours,
  lockerRentalRateAmount,
  pricingCurrency,
  owedCharges,
  billingHistory,
}: BillingFormProps) {
  const owedCurrency = owedCharges[0]?.currency ?? pricingCurrency;
  const owedTotal = owedCharges.reduce((sum, charge) => sum + charge.amount, 0);

  const returnsTotal = owedCharges
    .filter((charge) => isReturnKind(charge.kind))
    .reduce((sum, charge) => sum + charge.amount, 0);
  const storageTotal = owedCharges
    .filter((charge) => charge.kind === 'locker_rental')
    .reduce((sum, charge) => sum + charge.amount, 0);

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <SettingsFormSection title="Montant à payer">
        <p style={{ margin: '0 0 0.75rem', fontSize: '1.35rem', fontWeight: 700, color: colors.secondary }}>
          {formatDeliveryFee(owedTotal, owedCurrency)}
        </p>
        {owedCharges.length === 0 ? (
          <p className="ops-empty__description" style={{ margin: 0 }}>
            Aucun montant dû pour le moment.
          </p>
        ) : (
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gap: '0.35rem',
              fontSize: 14,
              color: colors.secondary,
            }}
          >
            {returnsTotal > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <dt style={{ margin: 0 }}>Retours</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>
                  {formatDeliveryFee(returnsTotal, owedCurrency)}
                </dd>
              </div>
            ) : null}
            {storageTotal > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <dt style={{ margin: 0 }}>Stockage</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>
                  {formatDeliveryFee(storageTotal, owedCurrency)}
                </dd>
              </div>
            ) : null}
          </dl>
        )}
      </SettingsFormSection>

      <p style={{ margin: 0, fontSize: 14, color: colors.textMuted, lineHeight: 1.45 }}>
        {pickupHoldHours} h de stockage incluses, puis{' '}
        {formatDeliveryFee(lockerRentalRateAmount, pricingCurrency)} / 24 h. Les frais de livraison et
        de retrait payés par le destinataire ne sont pas inclus dans votre facturation.
      </p>

      <SettingsFormSection title="Historique des frais">
        {billingHistory.length === 0 ? (
          <p className="ops-empty__description" style={{ margin: 0 }}>
            Aucun frais entreprise pour le moment.
          </p>
        ) : (
          <div className="nb-data-table">
            <div className="nb-data-table__scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Description</th>
                    <th scope="col">Colis</th>
                    <th scope="col" className="nb-data-table__numeric">
                      Montant
                    </th>
                    <th scope="col">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((charge) => (
                    <tr key={charge.id} className="nb-data-table__row">
                      <td>{dateFormatter.format(new Date(charge.createdAt))}</td>
                      <td>
                        {getBusinessBillingHistoryDescription(charge.kind, charge.quantity)}
                      </td>
                      <td>
                        <Link href={businessParcelPath(charge.parcelId)} className="nb-data-table__link">
                          {charge.parcelLabel}
                        </Link>
                      </td>
                      <td className="nb-data-table__numeric">
                        {formatDeliveryFee(charge.amount, charge.currency)}
                      </td>
                      <td>{getBusinessBillingChargeStatusLabel(charge.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SettingsFormSection>
    </div>
  );
}
