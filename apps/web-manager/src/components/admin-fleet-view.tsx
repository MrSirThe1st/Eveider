'use client';

import { Button, PageFrame } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddDriverModal } from '@/components/add-driver-form';
import { AdminDriverList } from '@/components/admin-driver-list';
import { WEB_ROUTES } from '@/lib/auth-routing';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';
import type { DriverListItem } from '@/server/drivers';

type AdminFleetViewProps = {
  drivers: DriverListItem[];
  serviceAreas: ServiceAreaOptionDto[];
  initialAddOpen?: boolean;
};

export function AdminFleetView({
  drivers,
  serviceAreas,
  initialAddOpen = false,
}: AdminFleetViewProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (initialAddOpen) setAddOpen(true);
  }, [initialAddOpen]);

  function openAdd() {
    setAddOpen(true);
  }

  function closeAdd() {
    setAddOpen(false);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('ajouter')) return;
    url.searchParams.delete('ajouter');
    const next = `${url.pathname}${url.search}${url.hash}`;
    router.replace(next, { scroll: false });
  }

  return (
    <PageFrame
      title="Flotte"
      description="Chauffeurs Eveider assignables aux Collectes et retours transportés."
      layout="wide"
      action={
        <Button type="button" size="sm" onClick={openAdd}>
          Ajouter un chauffeur
        </Button>
      }
    >
      <AdminDriverList drivers={drivers} onAddDriver={openAdd} />
      <AddDriverModal
        open={addOpen}
        onClose={closeAdd}
        apiPath="/api/admin/driver-dossiers"
        detailBasePath={WEB_ROUTES.adminDrivers}
        emailHint="L’invitation part par email. Il ouvre le lien — pas de mot de passe à créer."
        serviceAreas={serviceAreas}
      />
    </PageFrame>
  );
}
