'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import { Button } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { createClient, signOutClient } from '@/lib/supabase/client';

type DriverAccessViewProps = {
  fullName: string | null;
  email: string | null;
};

export function DriverAccessView({ fullName, email }: DriverAccessViewProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOutClient(createClient());
    router.replace('/');
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: colors.background,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 480,
          ...webCardStyle,
          padding: '2rem',
        }}
      >
        <h1
          style={{
            margin: '0 0 1rem',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: colors.secondary,
            lineHeight: 1.25,
          }}
        >
          Accès chauffeur
        </h1>
        <p style={{ margin: '0 0 1.25rem', fontWeight: 500, color: colors.textMuted }}>
          {fullName ? `Bonjour ${fullName}.` : 'Bonjour.'} Votre compte est actif
          {email ? ` (${email})` : ''}. Livraisons, itinéraire et historique seront dans
          l’application Eveider. En attendant qu’elle soit téléchargeable partout, cet écran
          confirme que votre invitation a bien été ouverte.
        </p>
        <Button type="button" variant="ghost" onClick={() => void handleSignOut()}>
          Se déconnecter
        </Button>
      </section>
    </main>
  );
}
