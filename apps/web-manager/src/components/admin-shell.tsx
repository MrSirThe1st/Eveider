'use client';

import {
  AppShell,
  IconBuilding,
  IconHome,
  IconLayout,
  IconMapPin,
  IconPackage,
  IconTruck,
  IconUser,
  type NavModule,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';

type AdminShellProps = {
  children: React.ReactNode;
};

const NAV_ICON_PROPS = { width: 16, height: 16 } as const;

const ADMIN_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/tableau-de-bord',
    icon: <IconHome {...NAV_ICON_PROPS} />,
    match: (p) => p === '/tableau-de-bord',
  },
  {
    id: 'colis',
    label: 'Colis',
    href: '/tableau-de-bord/colis',
    icon: <IconPackage {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/colis'),
  },
  {
    id: 'livraisons',
    label: 'Livraisons',
    href: '/tableau-de-bord/livraisons',
    icon: <IconTruck {...NAV_ICON_PROPS} />,
    match: (p) =>
      p.startsWith('/tableau-de-bord/livraisons') || p.startsWith('/tableau-de-bord/incidents'),
  },
  {
    id: 'organisations',
    label: 'Organisations',
    href: '/tableau-de-bord/organisations',
    icon: <IconBuilding {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/organisations'),
  },
  {
    id: 'points',
    label: 'Points',
    href: '/tableau-de-bord/points',
    icon: <IconMapPin {...NAV_ICON_PROPS} />,
    match: (p) =>
      p.startsWith('/tableau-de-bord/points') || p.startsWith('/tableau-de-bord/casiers'),
  },
  {
    id: 'chauffeurs',
    label: 'Chauffeurs',
    href: '/tableau-de-bord/chauffeurs',
    icon: <IconTruck {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/chauffeurs'),
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    href: '/tableau-de-bord/utilisateurs',
    icon: <IconUser {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/utilisateurs'),
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    href: '/tableau-de-bord/parametres/tarifs',
    icon: <IconLayout {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/parametres'),
  },
];

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <AppShell
      brand="Admin"
      brandShort="Admin"
      onSignOut={handleSignOut}
      modules={ADMIN_MODULES}
      profileHref="/tableau-de-bord/profil"
      toolbar={<ThemeToggle variant="menu" />}
    >
      {children}
    </AppShell>
  );
}
