import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { ParcelList } from '@/components/parcel-list';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPageContext } from '@/server/business';
import { listBusinessParcels } from '@/server/parcels';

export default async function BusinessParcelsPage() {
  const { profile, ctx } = await requireBusinessPageContext();
  const parcels = await listBusinessParcels(ctx, profile.businessId);

  return (
    <PageFrame
      title="Colis"
      description="Où en sont vos colis : situation actuelle, destinataire, point."
      layout="wide"
      action={
        <Link href={WEB_ROUTES.businessNewParcel} className="nb-btn nb-btn-primary nb-btn--sm">
          Nouveau colis
        </Link>
      }
    >
      <ParcelList parcels={parcels} />
    </PageFrame>
  );
}
