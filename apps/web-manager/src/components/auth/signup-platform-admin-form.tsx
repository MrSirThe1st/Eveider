'use client';

import { PLATFORM_ROLE_LABELS, type PlatformRole } from '@eveider/domain';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@eveider/ui';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/client';
import { AuthPasswordField } from './auth-password-field';
import { AuthPhoneField } from './auth-phone-field';
import styles from './auth-shell.module.css';

type SignupPlatformAdminFormProps = {
  adminInviteToken: string;
};

export function SignupPlatformAdminForm({ adminInviteToken }: SignupPlatformAdminFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteLocked, setInviteLocked] = useState(true);
  const [inviteHint, setInviteHint] = useState<string | null>(null);
  const [invitedRole, setInvitedRole] = useState<PlatformRole | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    void fetch(`/api/admin-invite/${adminInviteToken}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          setInviteLocked(false);
          setError(result.error ?? 'Invitation invalide');
          return;
        }
        const invite = result.data.invite as {
          email: string;
          invitedRole: PlatformRole;
          invitedRoleLabel: string;
        };
        setEmail(invite.email);
        setInvitedRole(invite.invitedRole);
        setInviteHint(`Invitation administrateur — ${invite.invitedRoleLabel}`);
      })
      .catch(() => {
        setInviteLocked(false);
        setError('Impossible de charger l’invitation');
      });
  }, [adminInviteToken]);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-platform-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          adminInviteToken,
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
        router.replace(`/connexion?adminInvite=${encodeURIComponent(adminInviteToken)}`);
        return;
      }

      router.replace(WEB_ROUTES.adminDashboard);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleRegister}>
      {inviteHint ? <p className={styles.panelSub}>{inviteHint}</p> : null}
      {invitedRole ? (
        <p className={styles.panelSub}>Rôle : {PLATFORM_ROLE_LABELS[invitedRole]}</p>
      ) : null}
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
        <span>Email</span>
        <input
          className={styles.input}
          type="email"
          required
          readOnly={inviteLocked}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
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
        {loading ? <Spinner size="sm" /> : 'Créer mon compte administrateur'}
      </button>
    </form>
  );
}
