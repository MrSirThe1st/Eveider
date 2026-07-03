'use client';

import { Suspense } from 'react';
import { colors } from '@eveider/config-ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { getPostLoginPath } from '@/lib/auth-routing';
import type { UserRole } from '@eveider/domain';

function ConnexionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || undefined;

  function handleAuthenticated(role: UserRole) {
    router.replace(getPostLoginPath(role, redirectTarget));
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background,
        padding: 24,
      }}
    >
      <Link
        href="/"
        style={{
          marginBottom: '2rem',
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.04em',
          color: colors.secondary,
          textDecoration: 'none',
        }}
      >
        ← RETOUR À L&apos;ACCUEIL
      </Link>
      <h1 style={{ margin: '0 0 2rem', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.06em' }}>
        ACCÈS PORTAIL EVEIDER
      </h1>
      <AuthForm
        mode="login"
        redirectParam={redirectTarget}
        onAuthenticated={handleAuthenticated}
      />
      <Link href="/inscription" style={{ marginTop: '1.5rem', fontWeight: 600, color: colors.secondary }}>
        Créer un compte entreprise
      </Link>
    </main>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: colors.secondary }}>Chargement...</div>}>
      <ConnexionContent />
    </Suspense>
  );
}
