import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { AddDriverForm } from '@/components/add-driver-form';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';

export default async function NewDriverPage() {
  await requireBusinessPermission('manage_couriers');

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
      />
    </PageFrame>
  );
}
