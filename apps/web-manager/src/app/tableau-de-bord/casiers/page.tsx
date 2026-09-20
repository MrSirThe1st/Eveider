import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { AdminLockerManager } from '@/components/admin-locker-manager';
import { listCityOptions } from '@/server/cities';
import { listLockers } from '@/server/lockers';
import { listServiceAreaOptions } from '@/server/service-areas';
import { getAdminSession } from '@/server/session';

type PageProps = {
  searchParams: Promise<{ cityId?: string; zoneId?: string }>;
};

export default async function AdminLockersPage({ searchParams }: PageProps) {
  const { ctx } = await getAdminSession();
  const params = await searchParams;
  const [lockers, serviceAreas, cities] = await Promise.all([
    listLockers(ctx),
    listServiceAreaOptions(ctx),
    listCityOptions(),
  ]);

  return (
    <PageFrame
      title="Casiers"
      description="Réseau de casiers intelligents Eveider — inventaire, occupation, géographie."
      layout="wide"
      action={
        <Link href="/tableau-de-bord/casiers/nouveau" className="nb-btn nb-btn-primary nb-btn--sm">
          Nouveau casier
        </Link>
      }
    >
      <AdminLockerManager
        lockers={lockers}
        serviceAreas={serviceAreas}
        cities={cities}
        initialCityId={params.cityId ?? ''}
        initialZoneId={params.zoneId ?? ''}
      />
    </PageFrame>
  );
}
