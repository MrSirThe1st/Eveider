'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@eveider/ui';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/client';
import { AuthPasswordField } from './auth-password-field';
import { AuthPhoneField } from './auth-phone-field';
import styles from './auth-shell.module.css';

type SignupDriverFormProps = {
  driverInviteToken: string;
};

export function SignupDriverForm({ driverInviteToken }: SignupDriverFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteHint, setInviteHint] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    void fetch(`/api/driver-invite/${encodeURIComponent(driverInviteToken)}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          setError(result.error ?? 'Invitation invalide');
          return;
        }
        const invite = result.data.invite as { email: string; fullName: string };
        setEmail(invite.email);
        setInviteHint(
          invite.fullName
            ? `Invitation chauffeur — ${invite.fullName}`
            : 'Invitation chauffeur Eveider',
        );
        const parts = invite.fullName.trim().split(/\s+/);
        if (parts.length >= 2) {
          setFirstName(parts[0]!);
          setLastName(parts.slice(1).join(' '));
        } else if (parts[0]) {
          setFirstName(parts[0]);
        }
      })
      .catch(() => setError('Impossible de charger l’invitation'));
  }, [driverInviteToken]);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          driverInviteToken,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la création du compte');
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        router.replace(`/connexion?driverInvite=${encodeURIComponent(driverInviteToken)}`);
        return;
      }

      router.replace(WEB_ROUTES.driverHome);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} method="dialog" onSubmit={handleRegister}>
      {inviteHint ? <p className={styles.panelSub}>{inviteHint}</p> : null}
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Prénom</span>
          <input
            className={styles.input}
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
          />
        </label>
        <label className={styles.field}>
          <span>Nom</span>
          <input
            className={styles.input}
            type="text"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
          />
        </label>
      </div>
      <label className={styles.field}>
        <span>E-mail</span>
        <input className={styles.input} type="email" required value={email} readOnly />
      </label>
      <AuthPhoneField label="Téléphone" value={phone} onChange={setPhone} required />
      <AuthPasswordField
        label="Mot de passe"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <AuthPasswordField
        label="Confirmer le mot de passe"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      <button className={styles.submitBtn} type="submit" disabled={loading}>
        {loading ? <Spinner size="sm" /> : 'Créer mon compte'}
      </button>
    </form>
  );
}
