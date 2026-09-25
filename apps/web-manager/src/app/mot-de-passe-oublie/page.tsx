import type { Metadata } from 'next';
import { ForgotPasswordView } from '@/components/auth/forgot-password-view';
import { redirectIfAuthenticated } from '@/lib/auth-redirect';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  description: 'Réinitialisez le mot de passe de votre compte Eveider.',
};

export default async function MotDePasseOubliePage() {
  await redirectIfAuthenticated();

  return <ForgotPasswordView />;
}
