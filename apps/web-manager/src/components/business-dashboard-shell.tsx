'use client';

import { AppShell, IconPackage, IconPlus } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WEB_ROUTES } from '@/lib/auth-routing';

type BusinessDashboardShellProps = {
  children: React.ReactNode;
};

export function BusinessDashboardShell({ children }: BusinessDashboardShellProps) {
  const router = useRouter();

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
          href: WEB_ROUTES.businessDashboard,
          label: 'MES COLIS',
          icon: <IconPackage />,
          isActive: (p) =>
            p === WEB_ROUTES.businessDashboard ||
            (p.startsWith(`${WEB_ROUTES.businessDashboard}/colis/`) &&
              p !== WEB_ROUTES.businessNewParcel),
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
