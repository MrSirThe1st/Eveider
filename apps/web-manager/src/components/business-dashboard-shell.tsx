'use client';

import { AppShell, IconHome, IconPackage, type NavModule } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WEB_ROUTES } from '@/lib/auth-routing';

type BusinessDashboardShellProps = {
  children: React.ReactNode;
};

const NAV_ICON_PROPS = { width: 16, height: 16 } as const;

/** Top-bar modules only — no left sidebar under Accueil / Colis. */
const BUSINESS_MODULES: NavModule[] = [
  {
    id: 'accueil',
    label: 'Accueil',
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
      brand="Entreprises"
      brandShort="Entreprises"
      maxWidth={1080}
      onSignOut={handleSignOut}
      modules={BUSINESS_MODULES}
      profileHref="/entreprise/tableau-de-bord/profil"
    >
      {children}
    </AppShell>
  );
}
