import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { ParcelList } from '@/components/parcel-list';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { hasBusinessPermission } from '@eveider/domain';
import { requireBusinessPermission } from '@/server/business';
import { listBusinessParcels } from '@/server/parcels';

type PageProps = {
  searchParams: Promise<{ attention?: string }>;
};

export default async function BusinessParcelsPage({ searchParams }: PageProps) {
  const { attention } = await searchParams;
  const { profile, ctx } = await requireBusinessPermission('view_parcels');
  const parcels = await listBusinessParcels(ctx, profile.businessId);
  const canCreate = hasBusinessPermission(profile.userRole, 'create_parcels');

  return (
    <PageFrame
      title="Colis"
      description="Identifiez, filtrez et suivez les envois de votre entreprise."
      layout="wide"
      action={
        canCreate ? (
          <Link href={WEB_ROUTES.businessNewParcel} className="nb-btn nb-btn-primary">
            Nouveau colis
          </Link>
        ) : undefined
      }
    >
      <ParcelList parcels={parcels} initialAttention={attention} canCreate={canCreate} />
    </PageFrame>
  );
}
