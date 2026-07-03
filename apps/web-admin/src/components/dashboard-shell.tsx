'use client';

import { AppShell, IconPackage, IconPlus } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/client';

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const base = WEB_ROUTES.businessDashboard;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(WEB_ROUTES.landing);
  }

  return (
    <AppShell
      brand="ENTREPRISES"
      brandShort="EN"
      storageKey="eveider-business-sidebar"
      maxWidth={1080}
      onSignOut={handleSignOut}
      navItems={[
        {
          href: base,
          label: 'MES COLIS',
          icon: <IconPackage />,
          isActive: (p) =>
            p === base ||
            (p.startsWith(`${base}/colis/`) && p !== WEB_ROUTES.businessNewParcel),
        },
        {
          href: WEB_ROUTES.businessNewParcel,
          label: 'NOUVEAU COLIS',
          icon: <IconPlus />,
          isActive: (p) => p === WEB_ROUTES.businessNewParcel,
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
