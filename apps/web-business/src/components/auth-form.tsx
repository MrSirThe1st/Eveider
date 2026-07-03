'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import { PasswordInput } from '@eveider/ui';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuthFormProps = {
  mode: 'login' | 'register';
  businessName?: string;
  redirectParam?: string;
  onAuthenticated: () => void;
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.5rem',
  height: 48,
  padding: '0 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.button,
  fontWeight: 500,
};

export function AuthForm({ mode, businessName, redirectParam, onAuthenticated }: AuthFormProps) {
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

      const onboardResponse = await fetch('/api/auth/onboard', {
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
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

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

      const role = meResult.data.profile.role;
      if (role === 'admin') {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3000';

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${adminUrl}/api/auth/session-transfer`;

        const addField = (name: string, value: string) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        };

        addField('access_token', signInData.session.access_token);
        addField('refresh_token', signInData.session.refresh_token);
        addField('redirect', redirectParam || '/tableau-de-bord');

        document.body.appendChild(form);
        form.submit();
        return;
      } else if (role === 'business') {
        if (!meResult.data.profile.businessId) {
          setLoading(false);
          setError('Compte entreprise requis');
          await supabase.auth.signOut();
          return;
        }
      } else {
        setLoading(false);
        setError('Rôle non autorisé sur ce portail');
        await supabase.auth.signOut();
        return;
      }
    }

    setLoading(false);
    onAuthenticated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: '2rem',
        width: '100%',
        maxWidth: 400,
      }}
    >
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em' }}>
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
          background: colors.primary,
          color: colors.secondary,
          border: 'none',
          borderRadius: radius.button,
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'CHARGEMENT...' : mode === 'register' ? "CRÉER LE COMPTE" : 'SE CONNECTER'}
      </button>
    </form>
  );
}
