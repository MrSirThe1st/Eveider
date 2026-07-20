'use client';

import { colors, radius } from '@eveider/config-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthForm } from '@/components/auth-form';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function InscriptionPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');

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
        INSCRIPTION ENTREPRISE
      </h1>

      <div
        style={{
          background: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radius.card,
          padding: '1.5rem',
          width: '100%',
          maxWidth: 400,
          marginBottom: '1rem',
        }}
      >
        <label style={{ display: 'block' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>NOM ENTREPRISE</span>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            style={{
              display: 'block',
              width: '100%',
              marginTop: '0.5rem',
              height: 48,
              padding: '0 12px',
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              fontWeight: 500,
            }}
          />
        </label>
      </div>

      <AuthForm
        mode="register"
        businessName={businessName}
        onAuthenticated={() => router.replace(WEB_ROUTES.businessDashboard)}
      />

      <Link href="/connexion" style={{ marginTop: '1.5rem', fontWeight: 600, color: colors.secondary }}>
        Déjà inscrit ? Se connecter
      </Link>
    </main>
  );
}
