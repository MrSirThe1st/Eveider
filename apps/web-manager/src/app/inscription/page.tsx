import type { Metadata } from 'next';
import { SignupView } from '@/components/auth/signup-view';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Inscription entreprise ou destinataire sur Eveider.',
};

type PageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function InscriptionPage({ searchParams }: PageProps) {
  const { invite } = await searchParams;
  return <SignupView inviteToken={invite} />;
}
