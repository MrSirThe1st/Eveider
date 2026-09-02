import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { AddDriverForm } from '@/components/add-driver-form';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { listServiceAreaOptions } from '@/server/service-areas';

export default async function NewDriverPage() {
  const { ctx } = await requireBusinessPermission('manage_couriers');
  const serviceAreas = await listServiceAreaOptions(ctx);

  return (
    <PageFrame
      title="Ajouter un chauffeur"
      description="Ajoutez un chauffeur et envoyez-lui l’invitation sur le téléphone. Il ne pourra pas livrer tant qu’Eveider n’a pas contrôlé ses pièces."
      layout="standard"
      breadcrumbs={[
        { label: 'Chauffeurs', href: WEB_ROUTES.businessCouriers },
        { label: 'Nouveau chauffeur' },
      ]}
      action={
        <Link href={WEB_ROUTES.businessCouriers} className="nb-btn nb-btn-secondary nb-btn--sm">
          Retour
        </Link>
      }
    >
      <AddDriverForm
        apiPath="/api/organisation/drivers"
        detailBasePath={WEB_ROUTES.businessCouriers}
        serviceAreas={serviceAreas}
      />
    </PageFrame>
  );
}
