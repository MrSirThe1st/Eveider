import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { LockerCreatePage } from '@/components/locker-create-page';
import { listCityOptions } from '@/server/cities';
import { listServiceAreaOptions } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

export default async function AdminNewLockerPage() {
  const { ctx } = await getAdminSession();
  const [cities, serviceAreas] = await Promise.all([
    listCityOptions(),
    listServiceAreaOptions(ctx),
  ]);

  return (
    <PageFrame
      title="Nouveau casier"
      description="Localisation, ville, zone et configuration. La zone n’est jamais choisie automatiquement."
      layout="wide"
      breadcrumbs={[
        { label: 'Casiers', href: '/tableau-de-bord/casiers' },
        { label: 'Nouveau casier' },
      ]}
      action={
        <Link href="/tableau-de-bord/casiers" className="nb-btn nb-btn-secondary nb-btn--sm">
          Retour
        </Link>
      }
    >
      <LockerCreatePage cities={cities} serviceAreas={serviceAreas} />
    </PageFrame>
  );
}
