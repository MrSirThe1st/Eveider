'use client';

import {
  AppShell,
  IconAlert,
  IconHome,
  IconLayout,
  IconMapPin,
  IconPackage,
  IconTruck,
  type NavModule,
} from '@eveider/ui';
import type { BusinessPermission } from '@eveider/domain';
import { useRouter } from 'next/navigation';
import { OrganizationSettingsChrome } from '@/components/settings-chrome';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { WEB_ROUTES } from '@/lib/auth-routing';


type BusinessDashboardShellProps = {
  children: React.ReactNode;
  permissions?: readonly BusinessPermission[];
};

const NAV_ICON_PROPS = { width: 16, height: 16 } as const;

function can(permissions: readonly BusinessPermission[] | undefined, permission: BusinessPermission) {
  return (permissions ?? []).includes(permission);
}

export function BusinessDashboardShell({ children, permissions = [] }: BusinessDashboardShellProps) {
  const router = useRouter();

  const modules: NavModule[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      href: WEB_ROUTES.businessDashboard,
      icon: <IconHome {...NAV_ICON_PROPS} />,
      match: (p) => p === WEB_ROUTES.businessDashboard,
    },
    ...(can(permissions, 'view_parcels')
      ? [
          {
            id: 'colis',
            label: 'Colis',
            href: WEB_ROUTES.businessParcels,
            icon: <IconPackage {...NAV_ICON_PROPS} />,
            match: (p: string) => p.startsWith(WEB_ROUTES.businessParcels),
          },
          {
            id: 'points',
            label: 'Points',
            href: WEB_ROUTES.businessLockers,
            icon: <IconMapPin {...NAV_ICON_PROPS} />,
            match: (p: string) => p.startsWith(WEB_ROUTES.businessLockers),
          },
        ]
      : []),
    ...(can(permissions, 'manage_operations')
      ? [
          {
            id: 'incidents',
            label: 'Incidents',
            href: WEB_ROUTES.businessIssues,
            icon: <IconAlert {...NAV_ICON_PROPS} />,
            match: (p: string) => p.startsWith(WEB_ROUTES.businessIssues),
          },
        ]
      : []),
    ...(can(permissions, 'manage_drivers')
      ? [
          {
            id: 'chauffeurs',
            label: 'Chauffeurs',
            href: WEB_ROUTES.businessCouriers,
            icon: <IconTruck {...NAV_ICON_PROPS} />,
            match: (p: string) => p.startsWith(WEB_ROUTES.businessCouriers),
          },
        ]
      : []),
    {
      id: 'parametres',
      label: 'Paramètres',
      href: WEB_ROUTES.businessSettings,
      icon: <IconLayout {...NAV_ICON_PROPS} />,
      match: (p: string) =>
        p.startsWith(WEB_ROUTES.businessSettings) ||
        p.startsWith(WEB_ROUTES.businessVerification) ||
        p.startsWith('/organisation/tableau-de-bord/profil'),
    },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(WEB_ROUTES.landing);
  }

  return (
    <AppShell
      brand="Eveider"
      brandShort="Eveider"
      onSignOut={handleSignOut}
      modules={modules}
      profileHref={WEB_ROUTES.businessSettingsProfile}
      profileLabel="Mon compte"
      toolbar={<ThemeToggle />}
    >
      <OrganizationSettingsChrome permissions={permissions}>{children}</OrganizationSettingsChrome>
    </AppShell>
  );
}
