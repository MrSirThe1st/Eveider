'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Spinner } from '@eveider/ui';
import { AuthPasswordField } from './auth-password-field';
import { AuthPhoneField } from './auth-phone-field';
import styles from './auth-shell.module.css';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Propriétaire' },
  { value: 'manager', label: 'Gérant' },
  { value: 'logistics_employee', label: 'Logistique' },
] as const;

type SignupBusinessFormProps = {
  onOtpStepChange: (otp: boolean) => void;
};

export function SignupBusinessForm({ onOtpStepChange }: SignupBusinessFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<'account' | 'otp'>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userRole, setUserRole] = useState<(typeof ROLE_OPTIONS)[number]['value']>('owner');
  const [otpCode, setOtpCode] = useState('');

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
          userRole,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la création du compte');
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
        />
      </label>
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
      <div className={styles.roles}>
        <span>Je suis</span>
        {ROLE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={
              userRole === option.value
                ? `${styles.roleOption} ${styles.roleOptionActive}`
                : styles.roleOption
            }
          >
            <input
              type="radio"
              name="userRole"
              value={option.value}
              checked={userRole === option.value}
              onChange={() => setUserRole(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? <Spinner size="sm" color="currentColor" /> : null}
        {loading ? 'Création…' : 'Créer le compte'}
      </button>
    </form>
  );
}
