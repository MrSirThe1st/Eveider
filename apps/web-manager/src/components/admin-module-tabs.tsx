'use client';

import { PageTabs } from '@eveider/ui';
import { useOperationalBadges } from '@/components/operational-badges-context';

const LIVRAISONS_PATH = '/tableau-de-bord/livraisons';
const INCIDENTS_PATH = '/tableau-de-bord/incidents';
const ASSIGN_PATH = '/tableau-de-bord/colis?attention=awaiting_assignment';

export function AdminLivraisonsTabs() {
  const badges = useOperationalBadges().admin;
  const assignCount =
    (badges?.awaitingAssignment ?? 0) + (badges?.awaitingReturnAssignment ?? 0);
  const incidentsCount = badges?.incidents ?? 0;

  return (
    <PageTabs
      aria-label="Vues livraisons"
      tabs={[
        {
          href: LIVRAISONS_PATH,
          label: 'En cours',
          isActive: (pathname: string, search: string) => {
            if (pathname !== LIVRAISONS_PATH) return false;
            const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
            const current = params.get('view');
            return !current || current === 'active';
          },
        },
        {
          href: ASSIGN_PATH,
          label: 'À assigner',
          badge: assignCount > 0 ? assignCount : undefined,
          isActive: (pathname: string, search: string) => {
            if (!pathname.startsWith('/tableau-de-bord/colis')) return false;
            const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
            return params.get('attention') === 'awaiting_assignment';
          },
        },
        {
          href: INCIDENTS_PATH,
          label: 'Incidents',
          badge: incidentsCount > 0 ? incidentsCount : undefined,
          isActive: (pathname: string) => pathname.startsWith(INCIDENTS_PATH),
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
