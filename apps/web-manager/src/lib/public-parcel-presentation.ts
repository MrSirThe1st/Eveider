import type {
  ParcelReturnMethod,
  ParcelReturnStatus,
  ParcelStatus,
  ShipmentPickupType,
} from '@eveider/domain';

type PublicPayment = {
  required?: boolean;
  status?: string | null;
  integrityError?: 'CANONICAL_CHARGE_MISSING' | null;
};

type PublicParcel = {
  status: ParcelStatus;
  pickupType: ShipmentPickupType;
  pickupPin?: string | null;
  pickupPayment?: PublicPayment | null;
  customerReturn?: {
    status: ParcelReturnStatus;
    method?: ParcelReturnMethod | null;
  } | null;
};

export type PublicJourneyStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

function isFlow2(pickupType: ShipmentPickupType | null | undefined): boolean {
  return pickupType === 'merchant_dropoff';
}

export function getPublicParcelStatus(input: {
  status: ParcelStatus;
  pickupType?: ShipmentPickupType | null;
  customerReturn?: { status: ParcelReturnStatus } | null;
}): string {
  const ret = input.customerReturn;
  if (ret) {
    if (ret.status === 'requested') return 'Retour demandé';
    if (ret.status === 'rejected') return 'Retour refusé';
    if (ret.status === 'cancelled') return 'Retour annulé';
    if (ret.status === 'authorized') return 'Retour autorisé';
    if (ret.status === 'awaiting_pickup' || input.status === 'return_at_point') {
      return 'Retour au casier';
    }
    if (ret.status === 'in_transit' || input.status === 'returning') return 'Retour en cours';
    if (ret.status === 'completed' || input.status === 'returned') return 'Retourné à l’entreprise';
  }

  if (input.status === 'returned' && !ret) return 'Retour à l’expéditeur';

  switch (input.status) {
    case 'created':
      return 'Colis préparé';
    case 'in_transit':
      return 'En cours de transport';
    case 'delivered_to_locker':
      return isFlow2(input.pickupType) ? 'Déposé au casier' : 'Arrivé au casier';
    case 'ready_for_pickup':
      return 'Prêt au retrait';
    case 'collected':
      return 'Retiré';
    case 'return_at_point':
      return 'Retour au casier';
    case 'returning':
      return 'Retour en cours';
    case 'returned':
      return 'Retourné à l’entreprise';
    default:
      return 'Colis';
  }
}

function markSteps(labels: string[], currentIndex: number): PublicJourneyStep[] {
  return labels.map((label, index) => ({
    id: `${index}-${label}`,
    label,
    done: index < currentIndex,
    current: index === currentIndex,
  }));
}

function outboundIndex(status: ParcelStatus): number {
  if (
    status === 'collected' ||
    status === 'returned' ||
    status === 'return_at_point' ||
    status === 'returning'
  ) {
    return 4;
  }
  if (status === 'ready_for_pickup') return 3;
  if (status === 'delivered_to_locker') return 2;
  if (status === 'in_transit') return 1;
  return 0;
}

function flow2Index(status: ParcelStatus): number {
  if (
    status === 'collected' ||
    status === 'returned' ||
    status === 'return_at_point' ||
    status === 'returning'
  ) {
    return 3;
  }
  if (status === 'ready_for_pickup') return 2;
  if (status === 'delivered_to_locker') return 1;
  return 0;
}

function returnIndex(
  status: ParcelReturnStatus,
  method: ParcelReturnMethod | null,
  parcelStatus: ParcelStatus,
): number {
  const threeB = method === 'business_pickup';
  if (status === 'requested') return 0;
  if (status === 'authorized') return 1;
  if (status === 'rejected' || status === 'cancelled') return 0;
  if (status === 'awaiting_pickup' || parcelStatus === 'return_at_point') return 2;
  if (!threeB && (status === 'in_transit' || parcelStatus === 'returning')) return 3;
  if (status === 'completed' || parcelStatus === 'returned') return threeB ? 3 : 4;
  return 1;
}

export function getPublicJourney(parcel: PublicParcel): {
  steps: PublicJourneyStep[];
  headline: string;
} {
  const ret = parcel.customerReturn;
  if (ret && ret.status !== 'rejected' && ret.status !== 'cancelled') {
    const threeB = ret.method === 'business_pickup';
    const labels = threeB
      ? ['Retour demandé', 'Retour autorisé', 'Retour au casier', 'Retourné à l’entreprise']
      : [
          'Retour demandé',
          'Retour autorisé',
          'Retour au casier',
          'Retour en cours',
          'Retourné à l’entreprise',
        ];
    const index = Math.min(
      returnIndex(ret.status, ret.method ?? null, parcel.status),
      labels.length - 1,
    );
    return {
      steps: markSteps(labels, index),
      headline: getPublicParcelStatus(parcel),
    };
  }

  if (isFlow2(parcel.pickupType)) {
    return {
      steps: markSteps(
        ['Colis préparé', 'Déposé au casier', 'Prêt au retrait', 'Retiré'],
        flow2Index(parcel.status),
      ),
      headline: getPublicParcelStatus(parcel),
    };
  }

  return {
    steps: markSteps(
      [
        'Colis préparé',
        'En cours de transport',
        'Arrivé au casier',
        'Prêt au retrait',
        'Retiré',
      ],
      outboundIndex(parcel.status),
    ),
    headline: getPublicParcelStatus(parcel),
  };
}

export function hasMissingCanonicalCharge(payment: PublicPayment | null | undefined): boolean {
  return payment?.integrityError === 'CANONICAL_CHARGE_MISSING';
}

export function needsPublicPayment(parcel: PublicParcel): boolean {
  return (
    parcel.status === 'ready_for_pickup' &&
    Boolean(parcel.pickupPayment?.required) &&
    parcel.pickupPayment?.status !== 'completed' &&
    !hasMissingCanonicalCharge(parcel.pickupPayment)
  );
}

export function canShowPublicCollectionCode(parcel: PublicParcel): boolean {
  if (parcel.status !== 'ready_for_pickup') return false;
  if (hasMissingCanonicalCharge(parcel.pickupPayment)) return false;
  if (needsPublicPayment(parcel)) return false;
  return Boolean(parcel.pickupPin);
}
