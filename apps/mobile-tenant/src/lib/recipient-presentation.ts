import type {
  DeliveryStatus,
  ParcelReturnMethod,
  ParcelReturnStatus,
  ParcelStatus,
  ShipmentPickupType,
} from '@eveider/domain';
import { isActiveDeliveryStatus } from '@eveider/domain';
import type { CustomerParcel, PickupPayment } from './api';

export type RecipientListSection = 'action' | 'progress' | 'recent';

export type RecipientPrimaryActionId =
  | 'pay'
  | 'view_collection_code'
  | 'request_return'
  | 'view_return_instructions'
  | 'support_charge'
  | 'retry_payment'
  | null;

export type RecipientJourneyStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

export type RecipientActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type RecipientStatusExplanation = {
  title: string;
  body: string | null;
};

export type RecipientPaymentPreview = {
  feeLabel: string;
  note: string;
  payableNow: boolean;
};

function hasDriverTakenCharge(deliveryStatus: DeliveryStatus | null | undefined): boolean {
  return Boolean(deliveryStatus && isActiveDeliveryStatus(deliveryStatus));
}

export function isFlow2DropOff(pickupType: ShipmentPickupType | null | undefined): boolean {
  return pickupType === 'merchant_dropoff';
}

export function isEveiderTransportFlow(pickupType: ShipmentPickupType | null | undefined): boolean {
  return pickupType === 'courier_pickup';
}

export function isHistoricalRecipientRts(parcel: Pick<CustomerParcel, 'status' | 'customerReturn'>): boolean {
  return parcel.status === 'returned' && !parcel.customerReturn;
}

export function formatRecipientFee(payment: PickupPayment | null | undefined): string | null {
  if (!payment?.amount || !payment.currency) return null;
  const amount = payment.amount.trim();
  const currency = payment.currency.trim().toUpperCase();
  if (!amount) return null;
  if (currency === 'USD') {
    const numeric = Number(amount);
    return Number.isFinite(numeric) ? `$${numeric.toFixed(2)}` : `$${amount}`;
  }
  return `${amount} ${currency}`;
}

export function getRecipientParcelStatus(parcel: CustomerParcel): string {
  const ret = parcel.customerReturn;
  if (ret) {
    if (ret.status === 'requested') return 'Retour demandé';
    if (ret.status === 'rejected') return 'Retour refusé';
    if (ret.status === 'cancelled') return 'Retour annulé';
    if (ret.status === 'authorized') return 'Retour autorisé';
    if (ret.status === 'awaiting_pickup' || parcel.status === 'return_at_point') {
      return 'Retour déposé au casier';
    }
    if (ret.status === 'in_transit' || parcel.status === 'returning') return 'Retour en cours';
    if (ret.status === 'completed' || parcel.status === 'returned') return 'Retourné à l’entreprise';
  }

  if (isHistoricalRecipientRts(parcel)) return 'Retour à l’expéditeur';

  switch (parcel.status) {
    case 'created':
      return hasDriverTakenCharge(parcel.deliveryStatus) ? 'Pris en charge' : 'Colis préparé';
    case 'in_transit':
      return 'En transport';
    case 'delivered_to_locker':
      return isFlow2DropOff(parcel.pickupType) ? 'Déposé au casier' : 'Arrivé au casier';
    case 'ready_for_pickup':
      return 'Prêt au retrait';
    case 'collected':
      return 'Retiré';
    case 'return_at_point':
      return 'Retour déposé au casier';
    case 'returning':
      return 'Retour en cours';
    case 'returned':
      return 'Retourné à l’entreprise';
    default:
      return 'Colis';
  }
}

export function getRecipientStatusExplanation(parcel: CustomerParcel): RecipientStatusExplanation {
  const business = parcel.businessName || 'l’expéditeur';
  const lockerName = parcel.customerReturn?.returnLocker?.name ?? parcel.locker?.name;

  const ret = parcel.customerReturn;
  if (ret?.status === 'requested') {
    return {
      title: 'Retour demandé',
      body: 'En attente de la décision de l’entreprise.',
    };
  }
  if (ret?.status === 'rejected') {
    return {
      title: 'Retour refusé',
      body: 'Le colis reste retiré. Aucun dépôt n’est demandé.',
    };
  }
  if (ret?.status === 'cancelled') {
    return {
      title: 'Retour annulé',
      body: 'Le colis reste retiré.',
    };
  }
  if (ret?.status === 'authorized') {
    return {
      title: 'Retour autorisé',
      body: lockerName
        ? `Déposez le colis au casier ${lockerName} avec votre code de retour.`
        : 'Déposez le colis au casier Eveider avec votre code de retour.',
    };
  }
  if (parcel.status === 'return_at_point' || ret?.status === 'awaiting_pickup') {
    return {
      title: 'Retour déposé au casier',
      body: 'Votre retour a été déposé. Il sera récupéré par Eveider ou l’entreprise selon le mode choisi.',
    };
  }
  if (parcel.status === 'returning' || ret?.status === 'in_transit') {
    return {
      title: 'Retour en cours',
      body: 'Votre retour est en route vers l’entreprise.',
    };
  }
  if (parcel.status === 'returned' || ret?.status === 'completed') {
    return {
      title: isHistoricalRecipientRts(parcel) ? 'Retour à l’expéditeur' : 'Retourné à l’entreprise',
      body: null,
    };
  }

  if (parcel.status === 'ready_for_pickup') {
    return {
      title: 'Votre colis est prêt !',
      body: lockerName
        ? `Retirez-le à ${lockerName}.`
        : 'Retirez-le à votre casier Eveider.',
    };
  }

  if (parcel.status === 'collected') {
    return {
      title: 'Colis retiré',
      body: lockerName ? `Vous avez retiré ce colis à ${lockerName}.` : null,
    };
  }

  if (parcel.status === 'delivered_to_locker') {
    return isFlow2DropOff(parcel.pickupType)
      ? {
          title: 'Votre colis est au casier',
          body: 'Il a été déposé au casier. Il sera bientôt prêt au retrait.',
        }
      : {
          title: 'Votre colis est arrivé au casier',
          body: 'Il sera bientôt prêt au retrait.',
        };
  }

  if (parcel.status === 'in_transit') {
    return {
      title: 'Votre colis est en transport',
      body: lockerName
        ? `Eveider l’achemine vers ${lockerName}.`
        : 'Eveider l’achemine vers votre casier.',
    };
  }

  if (parcel.status === 'created' && hasDriverTakenCharge(parcel.deliveryStatus)) {
    return {
      title: 'Votre colis est pris en charge',
      body: `Eveider a récupéré le colis auprès de ${business} et prépare son acheminement.`,
    };
  }

  if (isFlow2DropOff(parcel.pickupType)) {
    return {
      title: 'Votre colis attend son dépôt',
      body: `${business} déposera bientôt le colis au casier Eveider.`,
    };
  }

  return {
    title: 'Votre colis attend sa prise en charge',
    body: `Eveider récupérera le colis auprès de ${business} avant de l’acheminer vers votre casier.`,
  };
}

/** @deprecated Prefer getRecipientStatusExplanation */
export function getRecipientStatusDetail(parcel: CustomerParcel): string | null {
  return getRecipientStatusExplanation(parcel).body;
}

function markSteps(labels: string[], currentIndex: number): RecipientJourneyStep[] {
  return labels.map((label, index) => ({
    id: `${index}-${label}`,
    label,
    done: index < currentIndex,
    current: index === currentIndex,
  }));
}

function outboundIndex(parcel: CustomerParcel): number {
  if (
    parcel.status === 'collected' ||
    parcel.status === 'returned' ||
    parcel.status === 'return_at_point' ||
    parcel.status === 'returning'
  ) {
    return 5;
  }
  if (parcel.status === 'ready_for_pickup') return 4;
  if (parcel.status === 'delivered_to_locker') return 3;
  if (parcel.status === 'in_transit') return 2;
  if (hasDriverTakenCharge(parcel.deliveryStatus)) return 1;
  return 0;
}

function flow2Index(parcel: CustomerParcel): number {
  if (
    parcel.status === 'collected' ||
    parcel.status === 'returned' ||
    parcel.status === 'return_at_point' ||
    parcel.status === 'returning'
  ) {
    return 3;
  }
  if (parcel.status === 'ready_for_pickup') return 2;
  if (parcel.status === 'delivered_to_locker') return 1;
  return 0;
}

function returnJourneyIndex(
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

export function getRecipientJourney(parcel: CustomerParcel): {
  steps: RecipientJourneyStep[];
  headline: string;
  lockerVisual: 'empty' | 'incoming' | 'ready' | 'collected';
} {
  const ret = parcel.customerReturn;
  if (ret && ret.status !== 'rejected' && ret.status !== 'cancelled') {
    const threeB = ret.method === 'business_pickup';
    const labels = threeB
      ? ['Retour demandé', 'Retour autorisé', 'Retour déposé au casier', 'Retourné à l’entreprise']
      : [
          'Retour demandé',
          'Retour autorisé',
          'Retour déposé au casier',
          'Retour en cours',
          'Retourné à l’entreprise',
        ];
    const index = Math.min(
      returnJourneyIndex(ret.status, ret.method, parcel.status),
      labels.length - 1,
    );
    return {
      steps: markSteps(labels, index),
      headline: getRecipientParcelStatus(parcel),
      lockerVisual: lockerVisualFor(parcel.status),
    };
  }

  if (isFlow2DropOff(parcel.pickupType)) {
    const labels = ['Colis préparé', 'Déposé au casier', 'Prêt au retrait', 'Retiré'];
    return {
      steps: markSteps(labels, flow2Index(parcel)),
      headline: getRecipientParcelStatus(parcel),
      lockerVisual: lockerVisualFor(parcel.status),
    };
  }

  const labels = [
    'Colis préparé',
    'Pris en charge',
    'En transport',
    'Arrivé au casier',
    'Prêt au retrait',
    'Retiré',
  ];
  return {
    steps: markSteps(labels, outboundIndex(parcel)),
    headline: getRecipientParcelStatus(parcel),
    lockerVisual: lockerVisualFor(parcel.status),
  };
}

function lockerVisualFor(status: ParcelStatus): 'empty' | 'incoming' | 'ready' | 'collected' {
  if (status === 'collected' || status === 'returned') return 'collected';
  if (status === 'ready_for_pickup' || status === 'return_at_point') return 'ready';
  return 'incoming';
}

export function hasMissingCanonicalCharge(payment: PickupPayment | null | undefined): boolean {
  return payment?.integrityError === 'CANONICAL_CHARGE_MISSING';
}

export function needsRecipientPayment(parcel: CustomerParcel): boolean {
  return (
    parcel.status === 'ready_for_pickup' &&
    Boolean(parcel.pickupPayment?.required) &&
    parcel.pickupPayment?.status !== 'completed' &&
    !hasMissingCanonicalCharge(parcel.pickupPayment)
  );
}

export function isPaymentProviderUnavailable(parcel: CustomerParcel): boolean {
  return needsRecipientPayment(parcel) && parcel.pickupPayment?.paymentProviderAvailable === false;
}

export function canShowCollectionCode(parcel: CustomerParcel): boolean {
  if (parcel.status !== 'ready_for_pickup') return false;
  if (hasMissingCanonicalCharge(parcel.pickupPayment)) return false;
  if (needsRecipientPayment(parcel)) return false;
  return Boolean(parcel.pickupPin);
}

export function getRecipientPaymentPreview(parcel: CustomerParcel): RecipientPaymentPreview | null {
  const payment = parcel.pickupPayment;
  if (!payment) return null;
  if (hasMissingCanonicalCharge(payment)) return null;

  const fee = formatRecipientFee(payment);
  if (payment.status === 'completed') {
    return {
      feeLabel: fee ? `Frais de livraison ${fee}` : 'Frais de livraison',
      note: 'Payé',
      payableNow: false,
    };
  }

  if (!payment.required && !fee) return null;

  if (parcel.status === 'ready_for_pickup' && payment.required) {
    return {
      feeLabel: fee ? `Frais à payer : ${fee}` : 'Frais à payer',
      note: 'Payez pour obtenir votre code de retrait.',
      payableNow: true,
    };
  }

  if (fee || payment.required) {
    return {
      feeLabel: fee ? `Frais de livraison ${fee}` : 'Frais de livraison',
      note: 'À payer lorsque le colis sera disponible au retrait.',
      payableNow: false,
    };
  }

  return null;
}

export function getRecipientPrimaryAction(parcel: CustomerParcel): {
  id: RecipientPrimaryActionId;
  label: string;
} {
  if (parcel.status === 'ready_for_pickup') {
    if (hasMissingCanonicalCharge(parcel.pickupPayment)) {
      return { id: 'support_charge', label: 'Contacter le support' };
    }
    if (isPaymentProviderUnavailable(parcel)) {
      return { id: 'retry_payment', label: 'Réessayer le paiement' };
    }
    if (needsRecipientPayment(parcel)) {
      return { id: 'pay', label: 'Payer et obtenir mon code' };
    }
    if (canShowCollectionCode(parcel)) {
      return { id: 'view_collection_code', label: 'Voir le code de retrait' };
    }
  }

  if (parcel.customerReturn?.status === 'authorized' && parcel.customerReturn.canDeposit) {
    return { id: 'view_return_instructions', label: 'Voir les instructions de retour' };
  }
  if (parcel.customerReturn?.status === 'authorized') {
    return { id: 'view_return_instructions', label: 'Voir les instructions de retour' };
  }
  if (parcel.canRequestReturn && !parcel.customerReturn) {
    return { id: 'request_return', label: 'Demander un retour' };
  }
  return { id: null, label: '' };
}

export function getRecipientListSection(parcel: CustomerParcel): RecipientListSection {
  const primary = getRecipientPrimaryAction(parcel);
  if (
    parcel.status === 'ready_for_pickup' ||
    primary.id === 'pay' ||
    primary.id === 'view_collection_code' ||
    primary.id === 'view_return_instructions' ||
    (parcel.customerReturn?.status === 'authorized' &&
      (parcel.customerReturn.canDeposit || Boolean(parcel.customerReturn.returnCode)))
  ) {
    return 'action';
  }
  if (
    parcel.status === 'created' ||
    parcel.status === 'in_transit' ||
    parcel.status === 'delivered_to_locker' ||
    parcel.status === 'return_at_point' ||
    parcel.status === 'returning' ||
    parcel.customerReturn?.status === 'requested' ||
    parcel.customerReturn?.status === 'awaiting_pickup' ||
    parcel.customerReturn?.status === 'in_transit'
  ) {
    return 'progress';
  }
  return 'recent';
}

export function getRecipientNextActionHint(parcel: CustomerParcel): string | null {
  const action = getRecipientPrimaryAction(parcel);
  if (action.id === 'pay') {
    const fee = formatRecipientFee(parcel.pickupPayment);
    return fee ? `Frais à payer · ${fee}` : 'Frais à payer';
  }
  if (action.id === 'view_collection_code') return 'Code de retrait disponible';
  if (action.id === 'view_return_instructions') return 'Déposer le retour au casier';
  if (action.id === 'request_return') return null;
  if (parcel.status === 'delivered_to_locker') return 'Bientôt prêt au retrait';
  return null;
}

export function groupRecipientParcels(parcels: CustomerParcel[]): {
  action: CustomerParcel[];
  progress: CustomerParcel[];
  recent: CustomerParcel[];
} {
  const action: CustomerParcel[] = [];
  const progress: CustomerParcel[] = [];
  const recent: CustomerParcel[] = [];
  for (const parcel of parcels) {
    const section = getRecipientListSection(parcel);
    if (section === 'action') action.push(parcel);
    else if (section === 'progress') progress.push(parcel);
    else recent.push(parcel);
  }
  return { action, progress, recent };
}

export function applyRecipientMutationResult<T>(
  previous: T,
  result: RecipientActionResult<{ parcel: T }>,
): { value: T; error: string | null; succeeded: boolean } {
  if (!result.success) {
    return { value: previous, error: translateRecipientError(result.error), succeeded: false };
  }
  return { value: result.data.parcel, error: null, succeeded: true };
}

export function translateRecipientError(message: string): string {
  const value = message.trim();
  if (!value) return 'Action impossible pour le moment. Réessayez.';
  const lower = value.toLowerCase();
  if (lower.includes('canonical_charge_missing')) {
    return 'Les frais de ce colis ne sont pas encore disponibles. Contactez le support Eveider.';
  }
  if (
    lower.includes('network') ||
    lower.includes('inaccessible') ||
    lower.includes('délai') ||
    lower.includes('timeout') ||
    lower.includes('failed to fetch')
  ) {
    return 'Réseau indisponible. L’action n’a pas été enregistrée. Réessayez.';
  }
  if (lower.includes('non authentifié') || lower.includes('session')) {
    return 'Session expirée. Reconnectez-vous, puis réessayez.';
  }
  if (lower.includes('paiement') || lower.includes('payment')) {
    return value;
  }
  if (lower.includes('retour')) return value;
  if (lower.includes('select') || lower.includes('sql') || lower.includes('null value')) {
    return 'Action impossible pour le moment. Réessayez.';
  }
  return value;
}

export const RECIPIENT_FORBIDDEN_UI_COPY = [
  'Open locker',
  'Ouvrir le casier',
  'Ouvrir le compartiment',
  'Choisir un compartiment',
  'Node-RED',
  'PLC',
  'locker session',
  'PIN hash',
  'credential sync',
  'Chauffeur assigné',
  'Chauffeur en route',
  'Qui paie',
  'Livré au point',
] as const;
