import type { CustomerParcel } from './api';

export function needsPickupPayment(parcel: CustomerParcel): boolean {
  return (
    parcel.status === 'ready_for_pickup' &&
    Boolean(parcel.pickupPayment?.required) &&
    parcel.pickupPayment?.status !== 'completed'
  );
}

export function canShowPickupPin(parcel: CustomerParcel): boolean {
  if (parcel.status !== 'ready_for_pickup') return false;
  if (!parcel.pickupPayment?.required) return true;
  return parcel.pickupPayment.status === 'completed';
}

export function pickupActionLabel(parcel: CustomerParcel): string {
  return needsPickupPayment(parcel) ? 'PAYER ET RETIRER' : 'VOIR LE CODE DE RETRAIT';
}

export function pickupCardHint(parcel: CustomerParcel): string | null {
  if (parcel.status !== 'ready_for_pickup') return null;
  if (needsPickupPayment(parcel)) {
    const amount = parcel.pickupPayment?.amount;
    const currency = parcel.pickupPayment?.currency;
    if (amount && currency) {
      return `PAIEMENT ${amount} ${currency} REQUIS`;
    }
    return 'PAIEMENT REQUIS AVANT RETRAIT';
  }
  return 'CODE DE RETRAIT DISPONIBLE';
}
