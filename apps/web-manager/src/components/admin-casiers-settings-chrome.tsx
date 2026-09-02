'use client';

import { PageFrame } from '@eveider/ui';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminCasiersSettingsTabs } from '@/components/admin-module-tabs';

const CASIERS_ROOT = '/tableau-de-bord/parametres/casiers';

function resolveChrome(pathname: string): { title: string; description: string } {
  if (pathname.startsWith(`${CASIERS_ROOT}/modeles/nouveau`)) {
    return {
      title: 'Nouveau modèle',
      description:
        'Définissez la grille et les tailles S/M/L. Les casiers créés ensuite en héritent une copie.',
    };
  }
  if (
    pathname.startsWith(`${CASIERS_ROOT}/modeles/`) &&
    pathname !== `${CASIERS_ROOT}/modeles` &&
    !pathname.startsWith(`${CASIERS_ROOT}/modeles/nouveau`)
  ) {
    return {
      title: 'Modèle',
      description: 'Modifier ce modèle n’affecte pas les casiers déjà créés.',
    };
  }
  if (pathname.startsWith(`${CASIERS_ROOT}/modeles`)) {
    return {
      title: 'Casiers',
      description: 'Modèles de grille réutilisables pour créer des casiers standardisés.',
    };
  }
  if (pathname.startsWith(`${CASIERS_ROOT}/zones`)) {
    return {
      title: 'Casiers',
      description: 'Zones de service pour regrouper les points par ville d’exploitation.',
    };
  }
  return {
    title: 'Casiers',
    description: 'Règles réseau pour tailles, suggestions d’affectation et rétention.',
  };
}

/**
 * Persistent Casiers chrome (title + Configuration/Modèles tabs).
 * Page bodies and their loading.tsx only swap the content below the tabs.
 */
export function AdminCasiersSettingsChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { title, description } = resolveChrome(pathname);

  return (
    <PageFrame title={title} description={description} layout="standard">
      <AdminCasiersSettingsTabs />
      {children}
    </PageFrame>
  );
}
