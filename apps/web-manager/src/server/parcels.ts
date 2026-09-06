import type { DataAccessContext } from '@eveider/data-access';
import {
  createRepositories,
  getPool,
  syncParcelLockerRental,
  type ParcelCharge,
} from '@eveider/data-access';
import {
  formatDeliveryFee,
  type BusinessParcelLocation,
  type ParcelChargeKind,
} from '@eveider/domain';
import {
  toBusinessParcelLocationView,
  toParcelDto,
  type BusinessParcelProgressionItem,
  type ParcelDto,
} from '@/lib/business-parcel-presenter';
import { toParcelEventDto, type ParcelEventDto } from '@/lib/parcel-presenter';
import { listBusinessIssues, type IssueItem } from '@/server/issues';

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

export type ParcelInviteView = {
  status: 'pending' | 'accepted' | 'expired';
  deepLink: string;
  webLink: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export type ParcelChargeView = {
  id: string;
  kind: ParcelChargeKind;
  kindLabel: string;
  status: ParcelCharge['status'];
  amount: number;
  currency: ParcelCharge['currency'];
  amountLabel: string;
  unitRate: number | null;
  quantity: number | null;
  lockedAt: string;
};

export type BusinessParcelDetailView = ParcelDto & {
  location: BusinessParcelLocation;
  locationLabel: string;
  progression: BusinessParcelProgressionItem[];
  events: ParcelEventDto[];
  canCreateReturn: boolean;
  canAssignOutbound: boolean;
  canConfirmDeposit: boolean;
  readyForPickupAt: string | null;
  charges: ParcelChargeView[];
};

export type BusinessParcelOperationsView = {
  invite: ParcelInviteView | null;
  issues: IssueItem[];
};

const CHARGE_KIND_LABELS: Record<ParcelChargeKind, string> = {
  delivery_fee: 'Livraison Eveider',
  drop_off_fee: 'Dépôt marchand',
  locker_rental: 'Location casier',
};

function toChargeView(charge: ParcelCharge): ParcelChargeView {
  return {
    id: charge.id,
    kind: charge.kind,
    kindLabel: CHARGE_KIND_LABELS[charge.kind],
    status: charge.status,
    amount: charge.amount,
    currency: charge.currency,
    amountLabel: formatDeliveryFee(charge.amount, charge.currency),
    unitRate: charge.unitRate,
    quantity: charge.quantity,
    lockedAt: charge.lockedAt.toISOString(),
  };
}

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
      latestDeliveryKind: parcel.latestDeliveryKind,
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
  const { parcels, parcelEvents, deliveries, parcelCharges } = createRepositories();
  const parcel = await parcels.findForBusiness(ctx, businessId, parcelId);
  if (!parcel) return null;

  const location = toBusinessParcelLocationView({
    status: parcel.status,
    pickupType: parcel.pickupType,
    latestDeliveryStatus: parcel.latestDeliveryStatus,
    latestDeliveryKind: parcel.latestDeliveryKind,
  });

  if (parcel.status === 'ready_for_pickup' && parcel.readyForPickupAt) {
    try {
      await syncParcelLockerRental(getPool(), {
        parcelId: parcel.id,
        businessId: parcel.businessId,
        readyForPickupAt: parcel.readyForPickupAt,
        endAt: new Date(),
        lockerType: parcel.locker?.type ?? null,
        compartmentId: parcel.compartmentId,
        finalize: false,
      });
    } catch {
      // Display still works from existing charge rows if sync fails.
    }
  }

  const [events, canCreateReturn, charges] = await Promise.all([
    parcelEvents.listForParcel(ctx, parcelId),
    deliveries.canCreateReturn(ctx, parcelId),
    parcelCharges.listForParcel(parcelId),
  ]);

  return {
    ...toParcelDto(parcel),
    location: location.location,
    locationLabel: location.locationLabel,
    progression: location.progression,
    events: events.map(toParcelEventDto),
    canCreateReturn,
    canAssignOutbound:
      parcel.pickupType === 'courier_pickup' &&
      (parcel.status === 'created' || parcel.status === 'in_transit'),
    canConfirmDeposit:
      parcel.pickupType === 'merchant_dropoff' && parcel.status === 'created',
    readyForPickupAt: parcel.readyForPickupAt?.toISOString() ?? null,
    charges: charges.map(toChargeView),
  };
}

export async function loadBusinessParcelOperations(
  ctx: DataAccessContext,
  parcelId: string,
): Promise<BusinessParcelOperationsView> {
  const { invites } = createRepositories();
  const [invite, issues] = await Promise.all([
    invites.getForParcel(ctx, parcelId),
    listBusinessIssues(ctx, { parcelId }),
  ]);
  return { invite, issues };
}
