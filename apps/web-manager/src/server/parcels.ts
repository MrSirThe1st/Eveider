import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import type { BusinessParcelLocation } from '@eveider/domain';
import {
  toBusinessParcelLocationView,
  toParcelDto,
  type BusinessParcelProgressionItem,
  type ParcelDto,
} from '@/lib/business-parcel-presenter';

export type BusinessParcelListItem = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  location: BusinessParcelLocation;
  recipientName: string | null;
  recipientPhone: string;
  locker: { name: string; address: string } | null;
  createdAt: string;
};

export type BusinessParcelDetailView = ParcelDto & {
  location: BusinessParcelLocation;
  locationLabel: string;
  progression: BusinessParcelProgressionItem[];
};

export async function listBusinessParcels(
  ctx: DataAccessContext,
  businessId: string,
): Promise<BusinessParcelListItem[]> {
  const { parcels } = createRepositories();
  const items = await parcels.listBusinessColis(ctx, businessId);
  return items.map((parcel) => {
    const location = toBusinessParcelLocationView({
      status: parcel.status,
      pickupType: parcel.pickupType,
      latestDeliveryStatus: parcel.latestDeliveryStatus,
    });
    return {
      id: parcel.id,
      trackingNumber: parcel.trackingNumber,
      reference: parcel.reference,
      location: location.location,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      locker: parcel.locker,
      createdAt: parcel.createdAt.toISOString(),
    };
  });
}

export async function loadBusinessParcelDetail(
  ctx: DataAccessContext,
  businessId: string,
  parcelId: string,
): Promise<BusinessParcelDetailView | null> {
  const { parcels } = createRepositories();
  const parcel = await parcels.findForBusiness(ctx, businessId, parcelId);
  if (!parcel) return null;

  const location = toBusinessParcelLocationView({
    status: parcel.status,
    pickupType: parcel.pickupType,
    latestDeliveryStatus: parcel.latestDeliveryStatus,
  });

  return {
    ...toParcelDto(parcel),
    location: location.location,
    locationLabel: location.locationLabel,
    progression: location.progression,
  };
}
