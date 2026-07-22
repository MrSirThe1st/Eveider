'use client';

import { colors, radius, webCardStyle, webInputStyle, webPrimaryButtonStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Step = 'account' | 'otp';

export function BusinessRegistrationFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+243');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'logistics_employee'>('owner');

  // OTP Fields
  const [otpCode, setOtpCode] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
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

      setStep('otp');
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: otpCode,
        }),
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

  return (
    <div style={{ minHeight: '100vh', background: colors.background, padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ background: '#121212', color: '#09D40B', padding: '0.25rem 0.5rem', fontWeight: 800, fontSize: '0.75rem', borderRadius: 4 }}>EV</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.15em', color: '#121212' }}>EVEIDER BUSINESS</span>
          </Link>
          <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, color: colors.secondary }}>
            {step === 'account' ? 'Créer votre compte' : 'Vérification téléphone'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', fontWeight: 500 }}>
            {step === 'account'
              ? 'Rejoignez le réseau logistique Eveider en quelques clics'
              : `Entrez le code de vérification envoyé au : ${phone}`}
          </p>
        </div>

        {error ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        ) : null}

        {step === 'account' ? (
          <form onSubmit={handleRegister} style={{ ...webCardStyle, padding: '2rem', borderRadius: radius.card }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Prénom *</span>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  style={{ ...webInputStyle, marginTop: '0.35rem' }}
                />
              </label>

              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Nom *</span>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Kabamba"
                  style={{ ...webInputStyle, marginTop: '0.35rem' }}
                />
              </label>
            </div>

            <label style={{ display: 'block', marginTop: '1.25rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Email professionnel *</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@commerce.cd"
                style={{ ...webInputStyle, marginTop: '0.35rem' }}
              />
            </label>

            <label style={{ display: 'block', marginTop: '1.25rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Numéro de téléphone *</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+243 810 000 000"
                style={{ ...webInputStyle, marginTop: '0.35rem' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Mot de passe *</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...webInputStyle, marginTop: '0.35rem' }}
                />
              </label>

              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Confirmer mot de passe *</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...webInputStyle, marginTop: '0.35rem' }}
                />
              </label>
            </div>

            {/* Role Selection */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1E293B', display: 'block', marginBottom: '0.75rem' }}>
                Je suis :
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(
                  [
                    { value: 'owner', label: '○ Propriétaire (Owner)' },
                    { value: 'manager', label: '○ Gérant / Manager' },
                    { value: 'logistics_employee', label: '○ Employé Logistique' },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      border: userRole === option.value ? '2px solid #09D40B' : '1px solid #E2E8F0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: userRole === option.value ? '#F0FDF4' : '#FFFFFF',
                      fontWeight: userRole === option.value ? 700 : 500,
                      fontSize: '0.8125rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value={option.value}
                      checked={userRole === option.value}
                      onChange={() => setUserRole(option.value)}
                      style={{ accentColor: '#09D40B' }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...webPrimaryButtonStyle,
                marginTop: '1.75rem',
                width: '100%',
                height: 46,
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Création en cours…' : 'Créer le compte Business'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ ...webCardStyle, padding: '2rem', borderRadius: radius.card, textAlign: 'center' }}>
            <div style={{ background: '#F8FAFC', border: '1px border #E2E8F0', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>
                CODE DE TEST DÉVELOPPEMENT :
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.2em', color: '#09D40B' }}>
                123456
              </span>
            </div>

            <label style={{ display: 'block', textAlign: 'left', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Code OTP à 6 chiffres *</span>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                style={{ ...webInputStyle, marginTop: '0.35rem', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontWeight: 800 }}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...webPrimaryButtonStyle,
                width: '100%',
                height: 46,
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Vérification…' : 'Vérifier le numéro'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setStep('account')}
                style={{ ...webSecondaryButtonStyle, flex: 1, height: 38, fontSize: '0.75rem' }}
              >
                Changer de numéro
              </button>
              <button
                type="button"
                onClick={() => alert('Un nouveau code OTP de test (123456) vous a été réexpédié.')}
                style={{ ...webSecondaryButtonStyle, flex: 1, height: 38, fontSize: '0.75rem' }}
              >
                Renvoyer le code
              </button>
            </div>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/connexion" style={{ fontWeight: 600, fontSize: '0.8125rem', color: colors.secondary, textDecoration: 'none' }}>
            Déjà un compte ? Se connecter
          </Link>
        </div>

      </div>
    </div>
  );
}
