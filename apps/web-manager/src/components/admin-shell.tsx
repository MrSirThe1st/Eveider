'use client';

import {
  AppShell,
  IconBuilding,
  IconHome,
  IconMapPin,
  IconPackage,
  IconTruck,
  IconUser,
  type NavModule,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AdminShellProps = {
  children: React.ReactNode;
};

const NAV_ICON_PROPS = { width: 16, height: 16 } as const;

const ADMIN_MODULES: NavModule[] = [
  {
    id: 'accueil',
    label: 'Accueil',
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
    items: [
      { href: '/tableau-de-bord/livraisons', label: 'Actives' },
      { href: '/tableau-de-bord/livraisons?view=au_casier', label: 'Au casier' },
      { href: '/tableau-de-bord/livraisons?view=collected', label: 'Collectés' },
      { href: '/tableau-de-bord/livraisons?view=all', label: 'Toutes les activités' },
      { href: '/tableau-de-bord/incidents', label: 'Incidents' },
    ],
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    href: '/tableau-de-bord/parametres/tarifs',
    icon: <IconBuilding {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/parametres'),
    items: [{ href: '/tableau-de-bord/parametres/tarifs', label: 'Tarifs livraison' }],
  },
  {
    id: 'entreprises',
    label: 'Entreprises',
    href: '/tableau-de-bord/entreprises',
    icon: <IconBuilding {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/entreprises'),
    items: [
      {
        href: '/tableau-de-bord/entreprises',
        label: 'Entreprises actives',
        isActive: (pathname) =>
          pathname === '/tableau-de-bord/entreprises',
      },
      {
        href: '/tableau-de-bord/entreprises/applications',
        label: 'Dossiers / vérification',
        isActive: (pathname) =>
          pathname.startsWith('/tableau-de-bord/entreprises/applications'),
      },
    ],
  },
  {
    id: 'points',
    label: 'Points',
    href: '/tableau-de-bord/points',
    icon: <IconMapPin {...NAV_ICON_PROPS} />,
    match: (p) =>
      p.startsWith('/tableau-de-bord/points') || p.startsWith('/tableau-de-bord/casiers'),
    items: [{ href: '/tableau-de-bord/points', label: 'Tous les points' }],
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    href: '/tableau-de-bord/utilisateurs',
    icon: <IconUser {...NAV_ICON_PROPS} />,
    match: (p) => p.startsWith('/tableau-de-bord/utilisateurs'),
    items: [{ href: '/tableau-de-bord/utilisateurs', label: 'Tous les utilisateurs' }],
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
      maxWidth={1200}
      onSignOut={handleSignOut}
      modules={ADMIN_MODULES}
      profileHref="/tableau-de-bord/profil"
    >
      {children}
    </AppShell>
  );
}
