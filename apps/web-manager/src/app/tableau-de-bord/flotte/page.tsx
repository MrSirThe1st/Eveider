import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { AdminDriverList } from '@/components/admin-driver-list';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { loadAdminDriverRoster } from '@/server/drivers';
import { getAdminSession } from '@/server/session';

export default async function AdminDriversPage() {
  const session = await getAdminSession();
  const drivers = await loadAdminDriverRoster(session.ctx);

  return (
    <PageFrame
      title="Flotte"
      description="Chauffeurs Eveider assignables aux Collectes et retours transportés."
      layout="wide"
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.adminDashboard },
        { label: 'Flotte' },
      ]}
      action={
        <Link href={WEB_ROUTES.adminNewDriver} className="nb-btn nb-btn-primary nb-btn--sm">
          Ajouter un chauffeur
        </Link>
      }
    >
      <AdminDriverList drivers={drivers} />
    </PageFrame>
  );
}
