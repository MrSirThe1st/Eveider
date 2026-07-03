import type { DeliveryStatus, ParcelStatus } from '@eveider/domain';
import type { CustomerParcel } from './api';

export type LockerVisual = 'empty' | 'incoming' | 'ready' | 'collected';

export type JourneyStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

export type ParcelJourney = {
  lockerVisual: LockerVisual;
  steps: JourneyStep[];
  headline: string;
};

const JOURNEY_STEPS = [
  { id: 'received', label: 'REÇU' },
  { id: 'assigned', label: 'COURSIER' },
  { id: 'transit', label: 'EN ROUTE' },
  { id: 'ready', label: 'PRÊT' },
] as const;

function isAssigned(deliveryStatus: DeliveryStatus | null) {
  return deliveryStatus !== null;
}

function isInTransit(status: ParcelStatus, deliveryStatus: DeliveryStatus | null) {
  if (status === 'in_transit' || status === 'delivered_to_locker') return true;
  return deliveryStatus === 'scanned' || deliveryStatus === 'drop_off_pending' || deliveryStatus === 'completed';
}

function isReady(status: ParcelStatus) {
  return status === 'ready_for_pickup' || status === 'collected';
}

function buildSteps(
  status: ParcelStatus,
  deliveryStatus: DeliveryStatus | null,
): JourneyStep[] {
  const received = true;
  const assigned = isAssigned(deliveryStatus);
  const transit = isInTransit(status, deliveryStatus);
  const ready = isReady(status);

  const flags = [received, assigned, transit, ready];
  const firstPending = flags.findIndex((done) => !done);

  return JOURNEY_STEPS.map((step, index) => {
    const done = Boolean(flags[index]);
    const current = firstPending === -1 ? index === flags.length - 1 : index === firstPending;
    return { ...step, done, current };
  });
}

function lockerVisualFor(status: ParcelStatus): LockerVisual {
  if (status === 'collected') return 'collected';
  if (status === 'ready_for_pickup' || status === 'delivered_to_locker') return 'ready';
  return 'incoming';
}

function headlineFor(parcel: CustomerParcel): string {
  if (parcel.status === 'ready_for_pickup') return 'Votre colis est prêt';
  if (parcel.status === 'collected') return 'Colis retiré';
  if (parcel.status === 'delivered_to_locker') return 'Colis au casier';
  if (parcel.status === 'in_transit') return 'Colis en transit';
  if (parcel.deliveryStatus === 'assigned') return 'Coursier assigné';
  return 'Colis enregistré';
}

export function getParcelJourney(parcel: CustomerParcel): ParcelJourney {
  return {
    lockerVisual: lockerVisualFor(parcel.status),
    steps: buildSteps(parcel.status, parcel.deliveryStatus),
    headline: headlineFor(parcel),
  };
}

export function pickFeaturedParcel(parcels: CustomerParcel[]): CustomerParcel | null {
  if (parcels.length === 0) return null;

  const priority: ParcelStatus[] = [
    'ready_for_pickup',
    'delivered_to_locker',
    'in_transit',
    'created',
    'collected',
  ];

  for (const status of priority) {
    const match = parcels.find((p) => p.status === status);
    if (match) return match;
  }

  return parcels[0] ?? null;
}

export function lockerVisualForParcels(parcels: CustomerParcel[]): LockerVisual {
  if (parcels.length === 0) return 'empty';
  const featured = pickFeaturedParcel(parcels);
  return featured ? lockerVisualFor(featured.status) : 'empty';
}
