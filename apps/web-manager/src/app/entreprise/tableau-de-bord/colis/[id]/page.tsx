import { PageFrame } from '@eveider/ui';
import { notFound } from 'next/navigation';
import { BusinessParcelDetail } from '@/components/business-parcel-detail';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPageContext } from '@/server/business';
import { loadBusinessParcelDetail } from '@/server/parcels';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function BusinessParcelDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { profile, ctx } = await requireBusinessPageContext();
  const parcel = await loadBusinessParcelDetail(ctx, profile.businessId, id);

  if (!parcel) {
    notFound();
  }

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
      <BusinessParcelDetail parcel={parcel} justCreated={query.created === '1'} />
    </PageFrame>
  );
}
