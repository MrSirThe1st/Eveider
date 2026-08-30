'use client';

import { PageTabs } from '@eveider/ui';

type OrganizationDetailTabsProps = {
  basePath: string;
};

export function OrganizationDetailTabs({ basePath }: OrganizationDetailTabsProps) {
  return (
    <PageTabs
      aria-label="Sections organisation"
      tabs={[
        {
          href: basePath,
          label: 'Aperçu',
          isActive: (pathname) => pathname === basePath,
        },
        { href: `${basePath}/membres`, label: 'Membres' },
        { href: `${basePath}/chauffeurs`, label: 'Chauffeurs' },
        { href: `${basePath}/livraisons`, label: 'Livraisons' },
        { href: `${basePath}/verification`, label: 'Vérification' },
      ]}
    />
  );
}
