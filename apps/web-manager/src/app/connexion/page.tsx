import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoadingSpinner } from '@eveider/ui';
import { LoginView } from '@/components/auth/login-view';
import { redirectIfAuthenticated } from '@/lib/auth-redirect';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous au portail Eveider.',
};

export default async function ConnexionPage() {
  await redirectIfAuthenticated();

  return (
    <Suspense fallback={<LoadingSpinner label="Chargement…" />}>
      <LoginView />
    </Suspense>
  );
}
