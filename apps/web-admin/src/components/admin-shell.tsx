'use client';

import {
  AppShell,
  IconAlert,
  IconBuilding,
  IconLayout,
  IconLock,
  IconPackage,
  IconUser,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <AppShell
      brand="ADMIN"
      brandShort="AD"
      storageKey="eveider-admin-sidebar"
      maxWidth={1200}
      onSignOut={handleSignOut}
      navItems={[
        {
          href: '/tableau-de-bord',
          label: 'VUE D\'ENSEMBLE',
          icon: <IconLayout />,
          isActive: (p) => p === '/tableau-de-bord' || p.startsWith('/tableau-de-bord/colis'),
        },
        {
          href: '/tableau-de-bord/livraisons',
          label: 'LIVRAISONS',
          icon: <IconPackage />,
          isActive: (p) => p.startsWith('/tableau-de-bord/livraisons'),
        },
        {
          href: '/tableau-de-bord/entreprises',
          label: 'ENTREPRISES',
          icon: <IconBuilding />,
          isActive: (p) => p.startsWith('/tableau-de-bord/entreprises'),
        },
        {
          href: '/tableau-de-bord/casiers',
          label: 'CASIERS',
          icon: <IconLock />,
          isActive: (p) => p.startsWith('/tableau-de-bord/casiers'),
        },
        {
          href: '/tableau-de-bord/utilisateurs',
          label: 'UTILISATEURS',
          icon: <IconUser />,
          isActive: (p) => p.startsWith('/tableau-de-bord/utilisateurs'),
        },
        {
          href: '/tableau-de-bord/incidents',
          label: 'INCIDENTS',
          icon: <IconAlert />,
          isActive: (p) => p.startsWith('/tableau-de-bord/incidents'),
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
