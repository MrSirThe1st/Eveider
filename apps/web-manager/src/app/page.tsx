import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/landing-page';
import { getAuthenticatedLandingPath } from '@/lib/auth-routing';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { UserRole } from '@eveider/domain';

export const metadata: Metadata = {
  title: {
    absolute: 'Eveider — Livraison et retrait de colis à Kinshasa',
  },
  description:
    'Eveider est un réseau de casiers à Kinshasa. Les entreprises expédient, les coursiers déposent, les clients suivent et retirent leur colis — sans créer de compte.',
  openGraph: {
    title: 'Eveider — Livraison et retrait de colis à Kinshasa',
    description:
      'Casiers pour livrer et retirer des colis à Kinshasa. Suivi sans compte.',
    locale: 'fr_CD',
    type: 'website',
    images: [{ url: '/landing/locker-street.jpg', alt: 'Station de casiers à colis' }],
  },
};

export default async function HomePage() {
  let current = null;
  try {
    current = await getCurrentUser();
  } catch (error) {
    console.error('[HomePage] profile lookup failed; showing landing', error);
  }

  if (current) {
    const destination = getAuthenticatedLandingPath(current.profile.role as UserRole);
    if (destination && destination !== '/') {
      redirect(destination);
    }
  }

  return <LandingPage />;
}
