import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoadingSpinner } from '@eveider/ui';
import { LoginView } from '@/components/auth/login-view';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous au portail Eveider.',
};

export default function ConnexionPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Chargement…" />}>
      <LoginView />
    </Suspense>
  );
}
