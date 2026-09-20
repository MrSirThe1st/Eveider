import { formatDeliveryFee, type DeliveryPricingCurrency } from '@eveider/domain';
import { createRepositories } from '@eveider/data-access';
import type { ShipmentPickupType } from '@eveider/domain';

export type DeliveryQuoteInput = {
  lockerId: string;
  pickupType?: ShipmentPickupType;
};

export type DeliveryQuoteResult = {
  deliveryFeeAmount: number;
  deliveryFeeCurrency: DeliveryPricingCurrency;
  /** @deprecated Prefer deliveryFeeAmount */
  deliveryFeeFc: number;
  deliveryDistanceKm: number;
  pricingSizeUsed: null;
  deliveryFeeLabel: string;
  chargeKind: 'outbound_delivery' | 'locker_collection';
  payer: 'recipient';
  zoneCode: string | null;
  zoneName: string | null;
  purpose: string;
  /** Canonical charges are snapshotted at create, not deposit. */
  feeChargedOnDeposit: false;
};

export async function buildDeliveryQuote(input: DeliveryQuoteInput): Promise<DeliveryQuoteResult> {
  const { commercial } = createRepositories();
  const pickupType = input.pickupType ?? 'courier_pickup';
  const quoted = await commercial.quoteOutbound({
    pickupType,
    lockerId: input.lockerId,
  });

  return {
    deliveryFeeAmount: quoted.amount,
    deliveryFeeCurrency: quoted.currency,
    deliveryFeeFc: quoted.amount,
    deliveryDistanceKm: 0,
    pricingSizeUsed: null,
    deliveryFeeLabel: formatDeliveryFee(quoted.amount, quoted.currency),
    chargeKind: quoted.kind as 'outbound_delivery' | 'locker_collection',
    payer: 'recipient',
    zoneCode: quoted.zoneCode,
    zoneName: quoted.zoneName,
    purpose:
      quoted.kind === 'locker_collection'
        ? 'Frais de retrait · payé par le destinataire'
        : 'Frais de livraison · payé par le destinataire',
    feeChargedOnDeposit: false,
  };
}
