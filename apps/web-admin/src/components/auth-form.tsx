'use client';

import { colors, radius, spacing, shadows, borders } from '@eveider/config-ui';
import type { UserRole } from '@eveider/domain';
import { PasswordInput } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  getPostLoginPath,
  isMobileRole,
  WEB_ROUTES,
} from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/client';

type AuthFormProps = {
  mode: 'login' | 'register';
  businessName?: string;
  redirectParam?: string;
  onAuthenticated?: (role: UserRole) => void;
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.5rem',
  height: spacing.buttonHeight,
  padding: '0 12px',
  border: `${borders.width}px solid ${colors.border}`,
  borderRadius: radius.button,
  fontWeight: 500,
  fontSize: '1rem',
};

export function AuthForm({ mode, businessName, redirectParam, onAuthenticated }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === 'register') {
      if (!businessName?.trim()) {
        setLoading(false);
        setError('Nom entreprise requis');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        setLoading(false);
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setLoading(false);
        setError(
          'Compte créé mais connexion impossible. Désactivez la confirmation email dans Supabase (Auth → Providers → Email).',
        );
        return;
      }

      const onboardResponse = await fetch('/api/auth/onboard/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'business',
          email,
          business: {
            name: businessName.trim(),
            contactEmail: email,
          },
        }),
      });
      const onboardResult = await onboardResponse.json();

      if (!onboardResult.success) {
        setLoading(false);
        setError(onboardResult.error ?? 'Inscription échouée');
        await supabase.auth.signOut();
        return;
      }

      setLoading(false);
      if (onAuthenticated) {
        onAuthenticated('business');
      } else {
        router.replace(WEB_ROUTES.businessDashboard);
      }
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      setLoading(false);
      setError(signInError?.message ?? 'Échec de connexion');
      return;
    }

    const meResponse = await fetch('/api/auth/me');
    const meResult = await meResponse.json();

    if (!meResult.success) {
      setLoading(false);
      setError(meResult.error ?? 'Profil utilisateur introuvable');
      await supabase.auth.signOut();
      return;
    }

    const role = meResult.data.profile.role as UserRole;

    if (isMobileRole(role)) {
      setLoading(false);
      setError('Ce compte utilise l\'application mobile Eveider. Téléchargez l\'app pour vous connecter.');
      await supabase.auth.signOut();
      return;
    }

    if (role === 'business' && !meResult.data.profile.businessId) {
      setLoading(false);
      setError('Compte entreprise requis');
      await supabase.auth.signOut();
      return;
    }

    const destination = getPostLoginPath(role, redirectParam);
    setLoading(false);

    if (onAuthenticated) {
      onAuthenticated(role);
    } else {
      router.replace(destination);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        ...{
          background: colors.surface,
          border: `${borders.width}px solid ${colors.border}`,
          borderRadius: radius.card,
          boxShadow: shadows.hard,
        },
        padding: '2rem',
        width: '100%',
        maxWidth: 400,
      }}
    >
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {mode === 'register' ? 'INSCRIPTION' : 'CONNEXION'}
      </p>

      <label style={{ display: 'block', marginTop: '1.5rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>EMAIL</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@entreprise.cd"
          required
          autoComplete="email"
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'block', marginTop: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>MOT DE PASSE</span>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="8 caractères minimum"
          required
          minLength={8}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
      </label>

      {error ? (
        <p style={{ color: colors.danger, marginTop: '1rem', fontWeight: 500, fontSize: '0.875rem' }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: '1.5rem',
          width: '100%',
          height: spacing.buttonHeight,
          background: 'transparent',
          color: colors.secondary,
          border: `${borders.width}px solid ${colors.border}`,
          borderRadius: radius.button,
          boxShadow: 'none',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'CHARGEMENT...' : mode === 'register' ? "CRÉER LE COMPTE" : 'SE CONNECTER'}
      </button>
    </form>
  );
}
