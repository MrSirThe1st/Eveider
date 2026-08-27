'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Spinner } from '@eveider/ui';
import { AuthPasswordField } from './auth-password-field';
import { AuthPhoneField } from './auth-phone-field';
import type { SignupRole } from './auth-role-tabs';
import styles from './auth-shell.module.css';

type SignupMobileFormProps = {
  role: Exclude<SignupRole, 'business'>;
};

export function SignupMobileForm({ role }: SignupMobileFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const phoneRequired = role === 'customer';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    const hasPhone = phone.replace(/\D/g, '').length >= 12;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          email,
          password,
          fullName: fullName.trim() || undefined,
          phone: hasPhone ? phone : phoneRequired ? phone : undefined,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la création du compte');
        return;
      }
      setDone(true);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={styles.success}>
        <p>
          Compte destinataire créé. Continuez dans
          l’application mobile Eveider.
        </p>
        <Link href="/suivi" className={styles.submit}>
          Suivre un colis
        </Link>
        <Link href="/connexion" className={styles.ghostBtn}>
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Nom complet (optionnel)</span>
        <input
          className={styles.input}
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Patrick Mwamba"
          autoComplete="name"
        />
      </label>
      <label className={styles.field}>
        <span>Email</span>
        <input
          className={styles.input}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="vous@exemple.cd"
          autoComplete="email"
        />
      </label>
      <AuthPhoneField
        label="Téléphone destinataire"
        value={phone}
        onChange={setPhone}
        required={phoneRequired}
        hint="Utilisez le même numéro que sur vos colis pour les relier à ce compte."
      />
      <AuthPasswordField
        label="Mot de passe"
        value={password}
        onChange={setPassword}
        placeholder="8 caractères minimum"
        autoComplete="new-password"
      />
      <AuthPasswordField
        label="Confirmer le mot de passe"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="••••••••"
        autoComplete="new-password"
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? <Spinner size="sm" color="currentColor" /> : null}
        {loading ? 'Création…' : 'Créer le compte'}
      </button>
    </form>
  );
}
