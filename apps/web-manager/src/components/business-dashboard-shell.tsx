'use client';

import {
  AppShell,
  IconAlert,
  IconHome,
  IconLayout,
  IconPackage,
  IconReceipt,
  type NavModule,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { WEB_ROUTES } from '@/lib/auth-routing';

type BusinessDashboardShellProps = {
  children: React.ReactNode;
};

const NAV_ICON_PROPS = { width: 16, height: 16 } as const;

const BUSINESS_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    href: WEB_ROUTES.businessDashboard,
    icon: <IconHome {...NAV_ICON_PROPS} />,
    match: (p) => p === WEB_ROUTES.businessDashboard,
  },
  {
    id: 'colis',
    label: 'Colis',
    href: WEB_ROUTES.businessParcels,
    icon: <IconPackage {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith(WEB_ROUTES.businessParcels),
  },
  {
    id: 'incidents',
    label: 'Incidents',
    href: WEB_ROUTES.businessIssues,
    icon: <IconAlert {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith(WEB_ROUTES.businessIssues),
  },
  {
    id: 'facturation',
    label: 'Facturation',
    href: WEB_ROUTES.businessBilling,
    icon: <IconReceipt {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith(WEB_ROUTES.businessBilling),
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    href: WEB_ROUTES.businessSettings,
    icon: <IconLayout {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith(WEB_ROUTES.businessSettings) || p.startsWith('/entreprise/tableau-de-bord/profil'),
  },
];

export function BusinessDashboardShell({ children }: BusinessDashboardShellProps) {
  const router = useRouter();

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
      modules={BUSINESS_MODULES}
      profileHref={WEB_ROUTES.businessSettings}
      profileLabel="Paramètres"
      toolbar={<ThemeToggle variant="menu" />}
    >
      {children}
    </AppShell>
  );
}
