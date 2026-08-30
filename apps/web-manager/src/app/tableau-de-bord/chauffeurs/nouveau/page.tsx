import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { AddDriverForm } from '@/components/add-driver-form';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { getAdminSession } from '@/server/session';

export default async function AdminNewDriverPage() {
  await getAdminSession();

  return (
    <PageFrame
      title="Ajouter un chauffeur"
      description="Ajoutez un chauffeur Eveider et envoyez-lui l’invitation sur le téléphone. Il ne pourra pas livrer tant que ses pièces n’ont pas été contrôlées."
      layout="standard"
      breadcrumbs={[
        { label: 'Chauffeurs', href: WEB_ROUTES.adminDrivers },
        { label: 'Nouveau chauffeur' },
      ]}
      action={
        <Link href={WEB_ROUTES.adminDrivers} className="nb-btn nb-btn-secondary nb-btn--sm">
          Retour
        </Link>
      }
    >
      <AddDriverForm
        apiPath="/api/admin/driver-dossiers"
        detailBasePath={WEB_ROUTES.adminDrivers}
        emailHint="Chauffeur Eveider uniquement. L’invitation part tout de suite. Il ne pourra pas livrer tant que ses pièces n’ont pas été contrôlées."
      />
    </PageFrame>
  );
}
