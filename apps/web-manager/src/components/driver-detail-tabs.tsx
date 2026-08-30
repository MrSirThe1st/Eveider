'use client';

import { PageTabs } from '@eveider/ui';

type DriverDetailTabsProps = {
  basePath: string;
};

export function DriverDetailTabs({ basePath }: DriverDetailTabsProps) {
  return (
    <PageTabs
      aria-label="Sections chauffeur"
      tabs={[
        {
          href: basePath,
          label: 'Aperçu',
          isActive: (pathname) => pathname === basePath,
        },
        { href: `${basePath}/livraisons`, label: 'Livraisons' },
        { href: `${basePath}/documents`, label: 'Documents' },
      ]}
    />
  );
}
