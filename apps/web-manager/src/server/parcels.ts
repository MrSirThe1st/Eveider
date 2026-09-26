import type { DataAccessContext, ParcelCharge, ParcelDeliverySummary } from '@eveider/data-access';
import {
  createRepositories,
  getPool,
  syncParcelLockerRental,
} from '@eveider/data-access';
import {
  formatDeliveryFee,
  type DeliveryKind,
  type DeliveryStatus,
  type ParcelChargeKind,
  type ParcelReturnStatus,
  type ParcelStatus,
  type ShipmentPickupType,
} from '@eveider/domain';
import {
  toBusinessParcelLocationView,
  toParcelDto,
  type BusinessParcelProgressionItem,
  type ParcelDto,
} from '@/lib/business-parcel-presenter';
import {
  getBusinessAttentionLabel,
  getBusinessChargeLabel,
  getBusinessDeliveryKindLabel,
  getBusinessDeliveryStatusLabel,
  getBusinessParcelDisplayStatus,
  getBusinessReturnMethodLabel,
  getBusinessReturnProcessLabel,
  getFulfillmentMethodLabel,
  isBusinessOwedCharge,
} from '@/lib/business-presentation';
import { toParcelEventDto, type ParcelEventDto } from '@/lib/parcel-presenter';
import { toParcelReturnView, type ParcelReturnView } from '@/lib/parcel-return-presenter';
import { listBusinessIssues, type IssueItem } from '@/server/issues';

export type BusinessParcelListItem = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  statusLabel: string;
  pickupType: ShipmentPickupType;
  pickupTypeLabel: string;
  recipientName: string | null;
  recipientPhone: string;
  locker: { name: string; address: string } | null;
  attentionLabel: string | null;
  customerReturnStatus: ParcelReturnStatus | null;
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
  payer: ParcelCharge['payer'];
  status: ParcelCharge['status'];
  amount: number;
  currency: ParcelCharge['currency'];
  amountLabel: string;
  unitRate: number | null;
  quantity: number | null;
  lockedAt: string;
};

export type BusinessActiveDeliveryView = {
  id: string;
  kind: DeliveryKind;
  kindLabel: string;
  status: DeliveryStatus;
  statusLabel: string;
  driverName: string | null;
};

export type BusinessParcelDetailView = ParcelDto & {
  location: ReturnType<typeof toBusinessParcelLocationView>['location'];
  locationLabel: string;
  progression: BusinessParcelProgressionItem[];
  events: ParcelEventDto[];
  canCreateReturn: boolean;
  canAssignOutbound: boolean;
  canConfirmDeposit: boolean;
  readyForPickupAt: string | null;
  charges: ParcelChargeView[];
  recipientCharges: ParcelChargeView[];
  businessCharges: ParcelChargeView[];
  activeDelivery: BusinessActiveDeliveryView | null;
  customerReturn: ParcelReturnView | null;
  returnLockerOptions: Array<{ id: string; name: string; address: string }>;
};

export type BusinessParcelOperationsView = {
  invite: ParcelInviteView | null;
  issues: IssueItem[];
};

function toChargeView(charge: ParcelCharge): ParcelChargeView {
  return {
    id: charge.id,
    kind: charge.kind,
    kindLabel: getBusinessChargeLabel(charge.kind),
    payer: charge.payer,
    status: charge.status,
    amount: charge.amount,
    currency: charge.currency,
    amountLabel: formatDeliveryFee(charge.amount, charge.currency),
    unitRate: charge.unitRate,
    quantity: charge.quantity,
    lockedAt: charge.lockedAt.toISOString(),
  };
}

function toActiveDeliveryView(delivery: ParcelDeliverySummary): BusinessActiveDeliveryView {
  return {
    id: delivery.id,
    kind: delivery.kind,
    kindLabel: getBusinessDeliveryKindLabel(delivery.kind),
    status: delivery.status,
    statusLabel: getBusinessDeliveryStatusLabel(delivery.status),
    driverName: delivery.courier.fullName,
  };
}

export async function listBusinessParcels(
  ctx: DataAccessContext,
  businessId: string,
): Promise<BusinessParcelListItem[]> {
  const { parcels } = createRepositories();
  const items = await parcels.listBusinessColis(ctx, businessId);
  return items.map((parcel) => {
    const hasAssignedOutboundDelivery =
      parcel.pickupType === 'courier_pickup' &&
      parcel.latestDeliveryKind === 'outbound' &&
      parcel.latestDeliveryStatus === 'assigned';
    return {
      id: parcel.id,
      trackingNumber: parcel.trackingNumber,
      reference: parcel.reference,
      status: parcel.status,
      statusLabel: getBusinessParcelDisplayStatus({
        status: parcel.status,
        pickupType: parcel.pickupType,
        hasAssignedOutboundDelivery,
      }),
      pickupType: parcel.pickupType,
      pickupTypeLabel: getFulfillmentMethodLabel(parcel.pickupType),
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      locker: parcel.locker,
      attentionLabel: getBusinessAttentionLabel({
        status: parcel.status,
        pickupType: parcel.pickupType,
        customerReturnStatus: parcel.customerReturn?.status ?? null,
      }),
      customerReturnStatus: parcel.customerReturn?.status ?? null,
      createdAt: parcel.createdAt.toISOString(),
    };
  });
}

export async function loadBusinessParcelDetail(
  ctx: DataAccessContext,
  businessId: string,
  parcelId: string,
): Promise<BusinessParcelDetailView | null> {
  const { parcels, parcelEvents, deliveries, parcelCharges, parcelReturns, lockers } =
    createRepositories();
  const parcel = await parcels.findForBusiness(ctx, businessId, parcelId);
  if (!parcel) return null;

  const location = toBusinessParcelLocationView({
    status: parcel.status,
    pickupType: parcel.pickupType,
    latestDeliveryStatus: parcel.latestDeliveryStatus,
    latestDeliveryKind: parcel.latestDeliveryKind,
    customerReturn: parcel.customerReturn,
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

  const [events, canCreateReturn, charges, customerReturn, returnLockerOptions, activeDelivery] =
    await Promise.all([
      parcelEvents.listForParcel(ctx, parcelId),
      deliveries.canCreateReturn(ctx, parcelId),
      parcelCharges.listForParcel(parcelId),
      parcelReturns.findLatestForParcel(parcelId),
      lockers.listActivePickerOptions(),
      deliveries.findActiveForBusinessParcel(ctx, businessId, parcelId),
    ]);

  const chargeViews = charges.map(toChargeView);
  const returnView = customerReturn
    ? {
        ...toParcelReturnView(customerReturn),
        statusLabel: getBusinessReturnProcessLabel(customerReturn.status),
        methodLabel: getBusinessReturnMethodLabel(customerReturn.method),
        canAssignDriver: false,
      }
    : null;

  return {
    ...toParcelDto(parcel),
    location: location.location,
    locationLabel: location.locationLabel,
    progression: location.progression,
    events: events.map(toParcelEventDto),
    canCreateReturn,
    canAssignOutbound: false,
    canConfirmDeposit: parcel.pickupType === 'merchant_dropoff' && parcel.status === 'created',
    readyForPickupAt: parcel.readyForPickupAt?.toISOString() ?? null,
    charges: chargeViews.filter((charge) => isBusinessOwedCharge(charge.kind, charge.payer)),
    recipientCharges: chargeViews.filter((charge) => charge.payer === 'recipient'),
    businessCharges: chargeViews.filter((charge) => isBusinessOwedCharge(charge.kind, charge.payer)),
    activeDelivery: activeDelivery ? toActiveDeliveryView(activeDelivery) : null,
    customerReturn: returnView,
    returnLockerOptions,
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
