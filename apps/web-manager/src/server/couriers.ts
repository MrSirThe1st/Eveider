import type { CourierAdminDetail, CourierDossier } from '@eveider/data-access';
import { createRepositories, type DataAccessContext } from '@eveider/data-access';
import { COURIER_DOSSIER_STATUS_LABELS, type CourierDossierStatus } from '@eveider/domain';

export type CourierDetailDto = {
  courier: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    isBlocked: boolean;
    createdAt: string;
  };
  stats: CourierAdminDetail['stats'];
  deliveries: Array<{
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    parcel: {
      id: string;
      trackingNumber: string;
      reference: string | null;
      businessName: string;
      locker: { name: string; address: string } | null;
    };
  }>;
};

export async function getCourierDetail(
  ctx: DataAccessContext,
  courierId: string,
): Promise<CourierDetailDto | null> {
  const { deliveries } = createRepositories();
  const detail = await deliveries.getCourierAdminDetail(ctx, courierId);
  if (!detail) return null;

  return {
    courier: {
      id: detail.courier.id,
      fullName: detail.courier.fullName,
      email: detail.courier.email,
      phone: detail.courier.phone,
      isBlocked: detail.courier.isBlocked,
      createdAt: detail.courier.createdAt.toISOString(),
    },
    stats: detail.stats,
    deliveries: detail.deliveries.map((delivery) => ({
      id: delivery.id,
      status: delivery.status,
      createdAt: delivery.createdAt.toISOString(),
      completedAt: delivery.completedAt ? delivery.completedAt.toISOString() : null,
      parcel: delivery.parcel,
    })),
  };
}

export type CourierDossierView = {
  id: string;
  contractorType: 'eveider' | 'business';
  businessId: string | null;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  idDocumentUrl: string;
  notes: string | null;
  reviewNotes: string | null;
  status: CourierDossierStatus;
  statusLabel: string;
  createdAt: string;
};

export type AssignableCourierView = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
};

function toView(dossier: CourierDossier): CourierDossierView {
  return {
    id: dossier.id,
    contractorType: dossier.contractorType,
    businessId: dossier.businessId,
    userId: dossier.userId,
    fullName: dossier.fullName,
    email: dossier.email,
    phone: dossier.phone,
    idDocumentUrl: dossier.idDocumentUrl,
    notes: dossier.notes,
    reviewNotes: dossier.reviewNotes,
    status: dossier.status,
    statusLabel: COURIER_DOSSIER_STATUS_LABELS[dossier.status],
    createdAt: dossier.createdAt.toISOString(),
  };
}

export async function loadBusinessCourierDossiers(ctx: DataAccessContext) {
  const { courierDossiers } = createRepositories();
  const dossiers = await courierDossiers.listForBusiness(ctx);
  return dossiers.map(toView);
}

export async function loadAdminCourierDossiers() {
  const { courierDossiers } = createRepositories();
  const dossiers = await courierDossiers.listForAdmin();
  return dossiers.map(toView);
}

export async function loadAssignableBusinessCouriers(businessId: string): Promise<AssignableCourierView[]> {
  const { users } = createRepositories();
  const couriers = await users.listActiveCouriersByBusiness(businessId);
  return couriers.map((courier) => ({
    id: courier.id,
    fullName: courier.fullName,
    email: courier.email,
    phone: courier.phone,
  }));
}
