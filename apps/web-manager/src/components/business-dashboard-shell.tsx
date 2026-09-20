'use client';

import { AppShell, IconHome, IconLayout, IconPackage, type NavModule } from '@eveider/ui';
import type { BusinessPermission } from '@eveider/domain';
import { useRouter } from 'next/navigation';
import { OrganizationSettingsChrome } from '@/components/settings-chrome';
import { ThemeToggle } from '@/components/theme-toggle';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { BUSINESS_PRIMARY_NAV } from '@/lib/business-nav';
import { createClient } from '@/lib/supabase/client';

type BusinessDashboardShellProps = {
  children: React.ReactNode;
  permissions?: readonly BusinessPermission[];
  userName?: string | null;
  userEmail?: string | null;
};

const NAV_ICON_PROPS = { width: 16, height: 16 } as const;

function can(permissions: readonly BusinessPermission[] | undefined, permission: BusinessPermission) {
  return (permissions ?? []).includes(permission);
}

const NAV_ICONS = {
  dashboard: <IconHome {...NAV_ICON_PROPS} />,
  colis: <IconPackage {...NAV_ICON_PROPS} />,
  organisation: <IconLayout {...NAV_ICON_PROPS} />,
} as const;

export function BusinessDashboardShell({
  children,
  permissions = [],
  userName,
  userEmail,
}: BusinessDashboardShellProps) {
  const router = useRouter();

  const modules: NavModule[] = BUSINESS_PRIMARY_NAV.filter((item) => {
    if (item.id === 'colis') return can(permissions, 'view_parcels');
    return true;
  }).map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    icon: NAV_ICONS[item.id],
    section: 'section' in item ? item.section : undefined,
    match: (pathname: string) => {
      if (item.id === 'dashboard') return pathname === WEB_ROUTES.businessDashboard;
      if (item.id === 'colis') return pathname.startsWith(WEB_ROUTES.businessParcels);
      return (
        pathname.startsWith(WEB_ROUTES.businessSettings) ||
        pathname.startsWith('/organisation/tableau-de-bord/profil')
      );
    },
  }));

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
      userName={userName}
      userEmail={userEmail}
      toolbar={<ThemeToggle />}
    >
      <OrganizationSettingsChrome permissions={permissions}>{children}</OrganizationSettingsChrome>
    </AppShell>
  );
}
