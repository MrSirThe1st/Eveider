export {
  canShowCollectionCode as canShowPickupPin,
  needsRecipientPayment as needsPickupPayment,
} from './recipient-presentation';

import type { CustomerParcel } from './api';
import {
  canShowCollectionCode,
  getRecipientPrimaryAction,
  needsRecipientPayment,
} from './recipient-presentation';

export function pickupActionLabel(parcel: CustomerParcel): string {
  return getRecipientPrimaryAction(parcel).label || 'Voir le code de retrait';
}

export function pickupCardHint(parcel: CustomerParcel): string | null {
  if (parcel.status !== 'ready_for_pickup') return null;
  if (needsRecipientPayment(parcel)) {
    const amount = parcel.pickupPayment?.amount;
    const currency = parcel.pickupPayment?.currency;
    if (amount && currency) return `Frais à payer · ${amount} ${currency}`;
    return 'Frais à payer';
  }
  if (canShowCollectionCode(parcel)) return 'Code de retrait disponible';
  return null;
}
