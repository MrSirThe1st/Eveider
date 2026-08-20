import type { Metadata } from 'next';
import { SignupView } from '@/components/auth/signup-view';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Inscription entreprise, destinataire ou coursier sur Eveider.',
};

export default function InscriptionPage() {
  return <SignupView />;
}
