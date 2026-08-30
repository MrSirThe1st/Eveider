'use client';

import { normalizeUserRole } from '@eveider/domain';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@eveider/ui';
import { getPostLoginPath, isMobileRole, WEB_ROUTES } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/client';
import { LOGIN_VISUAL } from './auth-copy';
import { AuthPasswordField } from './auth-password-field';
import styles from './auth-shell.module.css';
import { AuthSplitShell } from './auth-split-shell';

const REMEMBER_KEY = 'eveider.rememberEmail';

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || undefined;
  const adminInvite = searchParams.get('adminInvite') || undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
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

    const role = normalizeUserRole(meResult.data.profile.persona ?? meResult.data.profile.role);
    if (!role) {
      setLoading(false);
      setError('Profil utilisateur introuvable');
      await supabase.auth.signOut();
      return;
    }

    if (isMobileRole(role)) {
      setLoading(false);
      setError(
        'Ce compte utilise l’application mobile Eveider. Téléchargez l’app pour vous connecter.',
      );
      await supabase.auth.signOut();
      return;
    }

    if (role === 'organization' && !meResult.data.profile.businessId) {
      setLoading(false);
      setError('Compte entreprise requis');
      await supabase.auth.signOut();
      return;
    }

    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, email);
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }

    if (adminInvite) {
      const acceptResponse = await fetch('/api/admin/platform-staff/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminInvite }),
      });
      const acceptResult = await acceptResponse.json();
      if (!acceptResult.success) {
        setLoading(false);
        setError(acceptResult.error ?? 'Impossible d’accepter l’invitation');
        await supabase.auth.signOut();
        return;
      }
      setLoading(false);
      router.replace(WEB_ROUTES.adminDashboard);
      return;
    }

    setLoading(false);
    router.replace(getPostLoginPath(role, redirectTarget));
  }

  return (
    <AuthSplitShell visual={LOGIN_VISUAL} visualKey="login">
      <div className={styles.formCardHead}>
        <div className={styles.panelHead}>
          <h1 className={styles.panelTitle}>Bon retour</h1>
          <p className={styles.panelSub}>
            Entrez votre email et votre mot de passe pour accéder au portail.
          </p>
        </div>
      </div>
      <div className={styles.formCardBody}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Email</span>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@entreprise.cd"
              required
              autoComplete="email"
            />
          </label>
          <AuthPasswordField
            label="Mot de passe"
            value={password}
            onChange={setPassword}
            placeholder="8 caractères minimum"
            autoComplete="current-password"
          />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Se souvenir de moi
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? <Spinner size="sm" color="currentColor" /> : null}
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className={styles.switchLine}>
          Pas encore de compte ? <Link href="/inscription">Créer un compte</Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}
