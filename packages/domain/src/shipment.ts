import type { CompartmentSize } from './locker-layout.js';

/** Aligns with DB PickupMethod — courier pickup vs merchant drop-off at a point. */
export type ShipmentPickupType = 'courier_pickup' | 'merchant_dropoff';

export type PaymentResponsibility = 'sender_pays' | 'receiver_pays' | 'cod';

export type PackageCategory =
  | 'documents'
  | 'fashion'
  | 'electronics'
  | 'food'
  | 'cosmetics'
  | 'other';

export type PackageSize = CompartmentSize;

export const SHIPMENT_PICKUP_TYPES: readonly ShipmentPickupType[] = [
  'courier_pickup',
  'merchant_dropoff',
] as const;

export const PAYMENT_RESPONSIBILITIES: readonly PaymentResponsibility[] = [
  'sender_pays',
  'receiver_pays',
  'cod',
] as const;

export const PACKAGE_CATEGORIES: readonly PackageCategory[] = [
  'documents',
  'fashion',
  'electronics',
  'food',
  'cosmetics',
  'other',
] as const;

export const PACKAGE_SIZES: readonly PackageSize[] = ['small', 'medium', 'large'] as const;

export const SHIPMENT_PICKUP_TYPE_LABELS: Record<ShipmentPickupType, string> = {
  courier_pickup: 'Enlèvement coursier',
  merchant_dropoff: 'Dépôt au point Eveider',
};

export const PAYMENT_RESPONSIBILITY_LABELS: Record<PaymentResponsibility, string> = {
  sender_pays: 'Expéditeur paie',
  receiver_pays: 'Destinataire paie',
  cod: 'Paiement à la livraison (COD)',
};

export const PACKAGE_CATEGORY_LABELS: Record<PackageCategory, string> = {
  documents: 'Documents',
  fashion: 'Mode / textile',
  electronics: 'Électronique',
  food: 'Alimentaire',
  cosmetics: 'Cosmétiques',
  other: 'Autre',
};

export const PACKAGE_SIZE_LABELS: Record<PackageSize, string> = {
  small: 'Petit (S)',
  medium: 'Moyen (M)',
  large: 'Grand (L)',
};

/** COD is not allowed at smart lockers — only partner / residential points. */
export function isCodAllowedForLockerType(lockerType: string): boolean {
  return lockerType === 'PARTNER_POINT' || lockerType === 'RESIDENTIAL_LOCKER';
}

export function requiresSenderAddress(pickupType: ShipmentPickupType): boolean {
  return pickupType === 'courier_pickup';
}

/** Customer pickup fee (PawaPay) only when receiver pays. */
export function requiresCustomerPickupPayment(
  paymentResponsibility: PaymentResponsibility,
): boolean {
  return paymentResponsibility === 'receiver_pays';
}

/** Suggest compartment size from package dimensions (cm). Business may override. */
export function suggestPackageSizeFromDimensions(input: {
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}): PackageSize | null {
  const dims = [input.lengthCm, input.widthCm, input.heightCm].filter(
    (value): value is number => value != null && Number.isFinite(value) && value > 0,
  );
  if (dims.length === 0) return null;

  const maxEdge = Math.max(...dims);
  if (maxEdge <= 35) return 'small';
  if (maxEdge <= 55) return 'medium';
  return 'large';
}
