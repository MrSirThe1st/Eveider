import { PageFrame } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { BusinessParcelDetail } from '@/components/business-parcel-detail';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { hasBusinessPermission } from '@eveider/domain';
import { requireBusinessPermission } from '@/server/business';
import { loadAssignableBusinessCouriers } from '@/server/couriers';
import {
  loadBusinessParcelDetail,
  loadBusinessParcelOperations,
} from '@/server/parcels';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function BusinessParcelDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { profile, ctx } = await requireBusinessPermission('view_parcels');
  const parcel = await loadBusinessParcelDetail(ctx, profile.businessId, id);

  if (!parcel) {
    notFound();
  }

  const canAssignCouriers = hasBusinessPermission(profile.userRole, 'manage_couriers');
  const canManageOperations = hasBusinessPermission(profile.userRole, 'manage_operations');

  const [assignableCouriers, operations] = await Promise.all([
    canAssignCouriers ? loadAssignableBusinessCouriers(profile.businessId) : Promise.resolve([]),
    canManageOperations
      ? loadBusinessParcelOperations(ctx, id)
      : Promise.resolve({ invite: null, issues: [] }),
  ]);

  return (
    <PageFrame
      title="Détail colis"
      description="Où en est ce colis, et ce qui s’est passé."
      layout="standard"
      breadcrumbs={[
        { label: 'Colis', href: WEB_ROUTES.businessParcels },
        { label: parcel.trackingNumber },
      ]}
    >
      <BusinessParcelDetail
        parcel={parcel}
        justCreated={query.created === '1'}
        canManageOperations={canManageOperations}
        canAssignCouriers={canAssignCouriers}
        assignableCouriers={assignableCouriers}
        invite={operations.invite}
        issues={operations.issues}
      />
    </PageFrame>
  );
}
