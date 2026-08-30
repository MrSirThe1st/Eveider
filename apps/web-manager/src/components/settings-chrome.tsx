'use client';

import type { BusinessPermission } from '@eveider/domain';
import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { SettingsLayoutShell } from '@/components/settings-layout-shell';
import {
  ADMIN_SETTINGS_NAV,
  ADMIN_SETTINGS_ROUTES,
  filterOrganizationSettingsNav,
  ORG_SETTINGS_ROUTES,
} from '@/lib/settings-nav';

type OrganizationSettingsChromeProps = {
  permissions: readonly BusinessPermission[];
  children: ReactNode;
};

/**
 * Instant settings chrome: secondary nav is driven by the already-mounted dashboard
 * shell (pathname + permissions), so it paints on navigation without waiting for an
 * async parametres layout RSC.
 */
export function OrganizationSettingsChrome({
  permissions,
  children,
}: OrganizationSettingsChromeProps) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith(ORG_SETTINGS_ROUTES.root);
  const groups = useMemo(
    () => filterOrganizationSettingsNav(permissions),
    [permissions],
  );

  if (!isSettings) return children;
  return <SettingsLayoutShell groups={groups}>{children}</SettingsLayoutShell>;
}

export function AdminSettingsChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith(ADMIN_SETTINGS_ROUTES.root);

  if (!isSettings) return children;
  return <SettingsLayoutShell groups={ADMIN_SETTINGS_NAV}>{children}</SettingsLayoutShell>;
}
