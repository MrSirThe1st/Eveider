import { EmptyState, IconMapPin, PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { LockerCreatePage } from '@/components/locker-create-page';
import { lockerCreateGeographyBlocker } from '@/lib/geography-presentation';
import { listCityOptions } from '@/server/cities';
import { listServiceAreaOptions } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

export default async function AdminNewLockerPage() {
  const { ctx } = await getAdminSession();
  const [cities, serviceAreas] = await Promise.all([
    listCityOptions(),
    listServiceAreaOptions(ctx),
  ]);
  const blocker = lockerCreateGeographyBlocker(cities.length, serviceAreas.length);

  return (
    <PageFrame
      title="Nouveau casier"
      description={
        blocker
          ? 'La géographie doit exister avant de créer un casier.'
          : 'Localisation, ville, zone et configuration. La zone n’est jamais choisie automatiquement.'
      }
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
      {blocker ? (
        <EmptyState
          title={blocker.title}
          description={blocker.description}
          icon={<IconMapPin />}
          action={
            <Link href={blocker.href} className="nb-btn nb-btn-primary nb-btn--sm">
              {blocker.ctaLabel}
            </Link>
          }
        />
      ) : (
        <LockerCreatePage cities={cities} serviceAreas={serviceAreas} />
      )}
    </PageFrame>
  );
}
