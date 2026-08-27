import { PageFrame } from '@eveider/ui';
import { BusinessCourierPanel } from '@/components/business-courier-panel';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessCourierDossiers } from '@/server/couriers';

export default async function BusinessCouriersPage() {
  const { ctx } = await requireBusinessPermission('manage_couriers');
  const dossiers = await loadBusinessCourierDossiers(ctx);

  return (
    <PageFrame
      title="Coursiers"
      description="Déposez un dossier d’identité. Eveider le valide, puis vous invitez le coursier dans l’app mobile."
      layout="wide"
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.businessDashboard },
        { label: 'Coursiers' },
      ]}
    >
      <BusinessCourierPanel dossiers={dossiers} />
    </PageFrame>
  );
}
