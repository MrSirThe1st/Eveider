'use client';

import { AppShell, IconPackage, IconPlus } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
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
          href: '/tableau-de-bord',
          label: 'MES COLIS',
          icon: <IconPackage />,
          isActive: (p) =>
            p === '/tableau-de-bord' ||
            (p.startsWith('/tableau-de-bord/colis/') && p !== '/tableau-de-bord/colis/nouveau'),
        },
        {
          href: '/tableau-de-bord/colis/nouveau',
          label: 'NOUVEAU COLIS',
          icon: <IconPlus />,
          isActive: (p) => p === '/tableau-de-bord/colis/nouveau',
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
