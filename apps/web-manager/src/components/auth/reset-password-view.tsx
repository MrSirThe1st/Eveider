'use client';

import { resetPasswordSchema } from '@eveider/api-contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@eveider/ui';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { createClient, signOutClient } from '@/lib/supabase/client';
import { AuthPasswordField } from './auth-password-field';
import { LOGIN_VISUAL } from './auth-copy';
import styles from './auth-shell.module.css';
import { AuthSplitShell } from './auth-split-shell';

export function ResetPasswordView() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function ensureRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setSessionReady(Boolean(session));
        setChecking(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
        setChecking(false);
      }
    });

    void ensureRecoverySession();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      setLoading(false);
      setError(updateError.message || 'Impossible de mettre à jour le mot de passe');
      return;
    }

    await signOutClient(supabase);
    setLoading(false);
    setSuccess(true);
    router.replace(`${WEB_ROUTES.login}?reset=1`);
  }

  return (
    <AuthSplitShell visual={LOGIN_VISUAL} visualKey="login">
      <div className={styles.formCardHead}>
        <div className={styles.panelHead}>
          <h1 className={styles.panelTitle}>Nouveau mot de passe</h1>
          <p className={styles.panelSub}>
            Choisissez un mot de passe d’au moins 8 caractères pour votre compte Eveider.
          </p>
        </div>
      </div>
      <div className={styles.formCardBody}>
        {checking ? (
          <p className={styles.hint}>Vérification du lien…</p>
        ) : !sessionReady ? (
          <div className={styles.success}>
            <p className={styles.error} style={{ background: 'transparent', padding: 0 }}>
              Lien invalide ou expiré. Demandez un nouveau lien de réinitialisation.
            </p>
            <Link href={WEB_ROUTES.forgotPassword} className={styles.submit}>
              Demander un nouveau lien
            </Link>
          </div>
        ) : success ? (
          <div className={styles.success}>
            <p>Mot de passe mis à jour. Vous pouvez vous connecter.</p>
            <Link href={WEB_ROUTES.login} className={styles.submit}>
              Se connecter
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
            <AuthPasswordField
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
            />
            <AuthPasswordField
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <Spinner size="sm" color="currentColor" /> : null}
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}
        {!checking && sessionReady && !success ? (
          <p className={styles.switchLine}>
            <Link href={WEB_ROUTES.login}>Retour à la connexion</Link>
          </p>
        ) : null}
      </div>
    </AuthSplitShell>
  );
}
