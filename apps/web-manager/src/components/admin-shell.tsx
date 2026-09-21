'use client';

import {
  AppShell,
  IconBuilding,
  IconHome,
  IconLayout,
  IconMapPin,
  IconPackage,
  IconTruck,
  IconUsers,
  type NavModule,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { AdminSettingsChrome } from '@/components/settings-chrome';
import { ThemeToggle } from '@/components/theme-toggle';
import { ADMIN_PRIMARY_NAV } from '@/lib/admin-nav';
import { signOutClient } from '@/lib/supabase/client';


type AdminShellProps = {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
};

const NAV_ICON_PROPS = { width: 16, height: 16 } as const;

const NAV_ICONS: Record<(typeof ADMIN_PRIMARY_NAV)[number]['id'], React.ReactNode> = {
  dashboard: <IconHome {...NAV_ICON_PROPS} />,
  colis: <IconPackage {...NAV_ICON_PROPS} />,
  livraisons: <IconTruck {...NAV_ICON_PROPS} />,
  casiers: <IconMapPin {...NAV_ICON_PROPS} />,
  flotte: <IconUsers {...NAV_ICON_PROPS} />,
  organisations: <IconBuilding {...NAV_ICON_PROPS} />,
  parametres: <IconLayout {...NAV_ICON_PROPS} />,
};

const ADMIN_MODULES: NavModule[] = ADMIN_PRIMARY_NAV.map((item) => ({
  id: item.id,
  label: item.label,
  href: item.href,
  icon: NAV_ICONS[item.id],
  section: 'section' in item ? item.section : undefined,
  match: (p: string) => {
    if (item.id === 'dashboard') return p === '/tableau-de-bord';
    if (item.id === 'livraisons') {
      return p.startsWith('/tableau-de-bord/livraisons') || p.startsWith('/tableau-de-bord/incidents');
    }
    if (item.id === 'casiers') {
      return p.startsWith('/tableau-de-bord/casiers') || p.startsWith('/tableau-de-bord/points');
    }
    if (item.id === 'flotte') {
      return p.startsWith('/tableau-de-bord/flotte') || p.startsWith('/tableau-de-bord/chauffeurs');
    }
    return p.startsWith(item.href);
  },
}));

export function AdminShell({ children, userName, userEmail }: AdminShellProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOutClient();
    router.replace('/');
  }

  return (
    <AppShell
      brand="Admin"
      brandShort="Admin"
      onSignOut={handleSignOut}
      modules={ADMIN_MODULES}
      profileHref="/tableau-de-bord/parametres/mon-compte/profil"
      profileLabel="Mon compte"
      userName={userName}
      userEmail={userEmail}
      toolbar={<ThemeToggle />}
    >
      <AdminSettingsChrome>{children}</AdminSettingsChrome>
    </AppShell>
  );
}
