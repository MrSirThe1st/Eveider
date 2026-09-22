'use client';

import { PageTabs } from '@eveider/ui';

const LIVRAISONS_PATH = '/tableau-de-bord/livraisons';
const INCIDENTS_PATH = '/tableau-de-bord/incidents';

export function AdminLivraisonsTabs() {
  return (
    <PageTabs
      aria-label="Vues livraisons"
      tabs={[
        {
          href: LIVRAISONS_PATH,
          label: 'Actives',
          isActive: (pathname: string, search: string) => {
            if (pathname !== LIVRAISONS_PATH) return false;
            const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
            const current = params.get('view');
            return !current || current === 'active';
          },
        },
        {
          href: `${LIVRAISONS_PATH}?view=all`,
          label: 'Historique',
          isActive: (pathname: string, search: string) => {
            if (pathname !== LIVRAISONS_PATH) return false;
            const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
            return params.get('view') === 'all';
          },
        },
        {
          href: INCIDENTS_PATH,
          label: 'Incidents',
          isActive: (pathname: string) => pathname.startsWith(INCIDENTS_PATH),
        },
      ]}
    />
  );
}

/** @deprecated Organisations directory no longer uses secondary tabs. */
export function AdminOrganisationsTabs() {
  return null;
}

/** @deprecated Use AdminOrganisationsTabs */
export const AdminEntreprisesTabs = AdminOrganisationsTabs;

export function AdminCasiersSettingsTabs() {
  return (
    <PageTabs
      aria-label="Paramètres casiers"
      tabs={[
        {
          href: '/tableau-de-bord/parametres/casiers/configuration',
          label: 'Configuration',
          isActive: (pathname: string) =>
            pathname.startsWith('/tableau-de-bord/parametres/casiers/configuration'),
        },
        {
          href: '/tableau-de-bord/parametres/casiers/modeles',
          label: 'Modèles',
          isActive: (pathname: string) =>
            pathname.startsWith('/tableau-de-bord/parametres/casiers/modeles'),
        },
      ]}
    />
  );
}
