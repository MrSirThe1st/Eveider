'use client';

import { PageFrame } from '@eveider/ui';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminLivraisonsTabs } from '@/components/admin-module-tabs';

const INCIDENTS_PATH = '/tableau-de-bord/incidents';

/**
 * Persistent Livraisons / Incidents chrome (title + tabs).
 * Page bodies and their loading.tsx only swap the content below the tabs.
 */
export function AdminLivraisonsChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isIncidents = pathname.startsWith(INCIDENTS_PATH);

  return (
    <PageFrame
      title={isIncidents ? 'Incidents' : 'Livraisons'}
      description={
        isIncidents
          ? 'Problèmes signalés, à traiter.'
          : 'Livraisons en cours et retraits.'
      }
      layout={isIncidents ? 'wide' : 'fluid'}
    >
      <AdminLivraisonsTabs />
      {children}
    </PageFrame>
  );
}
