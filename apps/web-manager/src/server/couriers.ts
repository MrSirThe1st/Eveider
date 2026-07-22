import type { CourierAdminDetail } from '@eveider/data-access';
import { createRepositories, type DataAccessContext } from '@eveider/data-access';

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
      reference: string;
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
