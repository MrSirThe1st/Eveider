'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Spinner } from '@eveider/ui';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/client';
import { LOGIN_VISUAL } from './auth-copy';
import styles from './auth-shell.module.css';
import { AuthSplitShell } from './auth-split-shell';

export function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(WEB_ROUTES.resetPassword)}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message || 'Impossible d’envoyer l’e-mail de réinitialisation');
      return;
    }

    setSent(true);
  }

  return (
    <AuthSplitShell visual={LOGIN_VISUAL} visualKey="login">
      <div className={styles.formCardHead}>
        <div className={styles.panelHead}>
          <h1 className={styles.panelTitle}>Mot de passe oublié</h1>
          <p className={styles.panelSub}>
            Indiquez l’e-mail de votre compte. Nous vous enverrons un lien pour en choisir un
            nouveau.
          </p>
        </div>
      </div>
      <div className={styles.formCardBody}>
        {sent ? (
          <div className={styles.success}>
            <p>
              Si un compte existe pour <strong>{email.trim()}</strong>, un e-mail de
              réinitialisation a été envoyé. Ouvrez le lien depuis cet appareil.
            </p>
            <Link href={WEB_ROUTES.login} className={styles.submit}>
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
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
            {error ? <p className={styles.error}>{error}</p> : null}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <Spinner size="sm" color="currentColor" /> : null}
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}
        {!sent ? (
          <p className={styles.switchLine}>
            <Link href={WEB_ROUTES.login}>Retour à la connexion</Link>
          </p>
        ) : null}
      </div>
    </AuthSplitShell>
  );
}
