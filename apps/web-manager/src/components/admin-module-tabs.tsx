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
          href: '/tableau-de-bord/organisations',
          label: 'Actives',
          isActive: (pathname: string) => pathname === '/tableau-de-bord/organisations',
        },
        {
          href: '/tableau-de-bord/organisations/applications',
          label: 'Dossiers',
          isActive: (pathname: string) =>
            pathname.startsWith('/tableau-de-bord/organisations/applications'),
        },
      ]}
    />
  );
}

export function AdminParametresTabs() {
  return (
    <PageTabs
      aria-label="Sections paramètres"
      tabs={[
        {
          href: '/tableau-de-bord/parametres/tarifs',
          label: 'Tarifs',
          isActive: (pathname: string) => pathname.startsWith('/tableau-de-bord/parametres/tarifs'),
        },
        {
          href: '/tableau-de-bord/parametres/casiers/configuration',
          label: 'Casiers',
          isActive: (pathname: string) =>
            pathname.startsWith('/tableau-de-bord/parametres/casiers'),
        },
      ]}
    />
  );
}

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
