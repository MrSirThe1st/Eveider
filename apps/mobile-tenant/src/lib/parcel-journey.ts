import type { CustomerParcel } from './api';
import { getRecipientJourney } from './recipient-presentation';

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

export function getParcelJourney(parcel: CustomerParcel): ParcelJourney {
  return getRecipientJourney(parcel);
}

export function pickFeaturedParcel(parcels: CustomerParcel[]): CustomerParcel | null {
  if (parcels.length === 0) return null;
  const ready = parcels.find((item) => item.status === 'ready_for_pickup');
  if (ready) return ready;
  return parcels[0] ?? null;
}

export function lockerVisualForParcels(parcels: CustomerParcel[]): LockerVisual {
  if (parcels.length === 0) return 'empty';
  const featured = pickFeaturedParcel(parcels);
  return featured ? getRecipientJourney(featured).lockerVisual : 'empty';
}
