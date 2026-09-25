import type { Metadata } from 'next';
import { ResetPasswordView } from '@/components/auth/reset-password-view';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  description: 'Choisissez un nouveau mot de passe pour votre compte Eveider.',
};

export default function ReinitialiserMotDePassePage() {
  return <ResetPasswordView />;
}
