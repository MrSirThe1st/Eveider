'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@eveider/ui';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { AuthPasswordField } from './auth-password-field';
import { AuthPhoneField } from './auth-phone-field';
import styles from './auth-shell.module.css';

type SignupBusinessFormProps = {
  onOtpStepChange: (otp: boolean) => void;
  inviteToken?: string;
};

export function SignupBusinessForm({ onOtpStepChange, inviteToken }: SignupBusinessFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<'account' | 'otp'>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteLocked, setInviteLocked] = useState(Boolean(inviteToken));
  const [inviteHint, setInviteHint] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    if (!inviteToken) return;
    void fetch(`/api/team-invite/${inviteToken}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          setInviteLocked(false);
          setError(result.error ?? 'Invitation invalide');
          return;
        }
        const invite = result.data.invite as { email: string; businessName: string };
        setEmail(invite.email);
        setInviteLocked(true);
        setInviteHint(`Invitation pour ${invite.businessName}`);
      })
      .catch(() => {
        setInviteLocked(false);
        setError('Impossible de charger l’invitation');
      });
  }, [inviteToken]);

  function goToOtp() {
    setStep('otp');
    onOtpStepChange(true);
  }

  function goToAccount() {
    setStep('account');
    onOtpStepChange(false);
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la création du compte');
        return;
      }
      if (result.data.joinedExistingCompany) {
        router.replace(WEB_ROUTES.businessDashboard);
        return;
      }
      goToOtp();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Code invalide');
        return;
      }
      router.replace('/onboarding');
    } catch {
      setError('Erreur de vérification.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp') {
    return (
      <form className={styles.form} onSubmit={handleVerifyOtp}>
        <div className={styles.otpBox}>
          <span className={styles.otpLabel}>Code de test</span>
          <span className={styles.otpCode}>123456</span>
        </div>
        <label className={styles.field}>
          <span>Code à 6 chiffres</span>
          <input
            className={`${styles.input} ${styles.otpInput}`}
            type="text"
            inputMode="numeric"
            required
            maxLength={6}
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value)}
            placeholder="123456"
          />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? <Spinner size="sm" color="currentColor" /> : null}
          {loading ? 'Vérification…' : 'Vérifier le numéro'}
        </button>
        <div className={styles.otpActions}>
          <button type="button" className={styles.ghostBtn} onClick={goToAccount}>
            Changer de numéro
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={() => setError(null)}>
            Renvoyer le code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleRegister}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Prénom</span>
          <input
            className={styles.input}
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Jean"
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
            placeholder="Kabamba"
            autoComplete="family-name"
          />
        </label>
      </div>
      <label className={styles.field}>
        <span>Email professionnel</span>
        <input
          className={styles.input}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="contact@commerce.cd"
          autoComplete="email"
          readOnly={inviteLocked}
        />
      </label>
      {inviteHint ? <p className={styles.panelSub}>{inviteHint}</p> : null}
      <AuthPhoneField
        label="Téléphone"
        value={phone}
        onChange={setPhone}
        required
      />
      <div className={styles.row}>
        <AuthPasswordField
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <AuthPasswordField
          label="Confirmer"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? <Spinner size="sm" color="currentColor" /> : null}
        {loading ? 'Création…' : 'Créer le compte'}
      </button>
    </form>
  );
}
