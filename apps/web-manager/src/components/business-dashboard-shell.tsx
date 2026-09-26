'use client';

import { AppShell, IconHome, IconLayout, IconMapPin, IconPackage, type NavModule } from '@eveider/ui';
import type { BusinessPermission } from '@eveider/domain';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  NotificationBell,
  type OperationalBadgeSnapshot,
} from '@/components/notification-bell';
import { OperationalBadgesProvider } from '@/components/operational-badges-context';
import { OrganizationSettingsChrome } from '@/components/settings-chrome';
import { ThemeToggle } from '@/components/theme-toggle';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { BUSINESS_PRIMARY_NAV } from '@/lib/business-nav';
import { signOutClient } from '@/lib/supabase/client';

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
  points: <IconMapPin {...NAV_ICON_PROPS} />,
  organisation: <IconLayout {...NAV_ICON_PROPS} />,
} as const;

export function BusinessDashboardShell({
  children,
  permissions = [],
  userName,
  userEmail,
}: BusinessDashboardShellProps) {
  const router = useRouter();
  const [badges, setBadges] = useState<OperationalBadgeSnapshot>({});

  const modules: NavModule[] = useMemo(
    () =>
      BUSINESS_PRIMARY_NAV.filter((item) => {
        if (item.id === 'colis' || item.id === 'points') return can(permissions, 'view_parcels');
        return true;
      }).map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: NAV_ICONS[item.id],
        section: 'section' in item ? item.section : undefined,
        badge: item.id === 'colis' ? badges.business?.colis : undefined,
        match: (pathname: string) => {
          if (item.id === 'dashboard') return pathname === WEB_ROUTES.businessDashboard;
          if (item.id === 'colis') return pathname.startsWith(WEB_ROUTES.businessParcels);
          if (item.id === 'points') return pathname.startsWith(WEB_ROUTES.businessLockers);
          return (
            pathname.startsWith(WEB_ROUTES.businessSettings) ||
            pathname.startsWith('/organisation/tableau-de-bord/profil')
          );
        },
      })),
    [badges, permissions],
  );

  async function handleSignOut() {
    await signOutClient();
    router.replace(WEB_ROUTES.landing);
  }

  return (
    <OperationalBadgesProvider value={badges}>
      <AppShell
        brand="Eveider"
        brandShort="Eveider"
        onSignOut={handleSignOut}
        modules={modules}
        profileHref={WEB_ROUTES.businessSettingsProfile}
        profileLabel="Mon compte"
        userName={userName}
        userEmail={userEmail}
        toolbar={
          <>
            <NotificationBell
              allHref="/organisation/tableau-de-bord/notifications"
              onBadges={setBadges}
            />
            <ThemeToggle />
          </>
        }
      >
        <OrganizationSettingsChrome permissions={permissions}>{children}</OrganizationSettingsChrome>
      </AppShell>
    </OperationalBadgesProvider>
  );
}
