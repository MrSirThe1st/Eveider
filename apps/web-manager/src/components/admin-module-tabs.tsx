'use client';

import { PageTabs } from '@eveider/ui';

const LIVRAISONS_PATH = '/tableau-de-bord/livraisons';
const INCIDENTS_PATH = '/tableau-de-bord/incidents';

function livraisonsViewIsActive(view: 'active' | 'au_casier' | 'collected') {
  return (pathname: string, search: string) => {
    if (pathname !== LIVRAISONS_PATH) return false;
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const current = params.get('view');
    if (view === 'active') return !current || current === 'active';
    return current === view;
  };
}

export function AdminLivraisonsTabs() {
  return (
    <PageTabs
      aria-label="Vues livraisons"
      tabs={[
        {
          href: LIVRAISONS_PATH,
          label: 'Actives',
          isActive: livraisonsViewIsActive('active'),
        },
        {
          href: `${LIVRAISONS_PATH}?view=au_casier`,
          label: 'Au casier',
          isActive: livraisonsViewIsActive('au_casier'),
        },
        {
          href: `${LIVRAISONS_PATH}?view=collected`,
          label: 'Collectés',
          isActive: livraisonsViewIsActive('collected'),
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

export function AdminEntreprisesTabs() {
  return (
    <PageTabs
      aria-label="Vues entreprises"
      tabs={[
        {
          href: '/tableau-de-bord/entreprises',
          label: 'Actives',
          isActive: (pathname: string) => pathname === '/tableau-de-bord/entreprises',
        },
        {
          href: '/tableau-de-bord/entreprises/applications',
          label: 'Dossiers',
          isActive: (pathname: string) =>
            pathname.startsWith('/tableau-de-bord/entreprises/applications'),
        },
      ]}
    />
  );
}
