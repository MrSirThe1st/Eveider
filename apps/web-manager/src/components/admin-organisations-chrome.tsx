'use client';

import { PageFrame } from '@eveider/ui';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminOrganisationsTabs } from '@/components/admin-module-tabs';

const VERIFICATION_PATH = '/tableau-de-bord/organisations/verification';

/**
 * Persistent Organisations directory chrome (title + tabs).
 * Page bodies and their loading.tsx only swap the content below the tabs.
 */
export function AdminOrganisationsChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isVerification = pathname.startsWith(VERIFICATION_PATH);

  return (
    <PageFrame
      title={isVerification ? 'Vérification' : 'Organisations'}
      description={
        isVerification
          ? 'Organisations ayant soumis un dossier en attente de revue Eveider.'
          : 'Annuaire des organisations Eveider. Le statut de compte et la vérification sont indépendants.'
      }
      layout="wide"
    >
      <AdminOrganisationsTabs />
      {children}
    </PageFrame>
  );
}
