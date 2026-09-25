'use client';

import { Button, InlineAlert, PasswordInput, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SettingsFieldGrid, SettingsForm, SettingsFormActions, SettingsFormSection } from '@/components/ops-ui';

type AccountProfileFormProps = {
  fullName: string;
  loginEmail: string | null;
  /** Org access code — omit for admin or when unavailable. */
  accessCode?: string | null;
  showAccessCode?: boolean;
};

export function AccountProfileForm({
  fullName: initialFullName,
  loginEmail: initialLoginEmail,
  accessCode = null,
  showAccessCode = false,
}: AccountProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [loginEmail, setLoginEmail] = useState(initialLoginEmail ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emailChanged =
    loginEmail.trim().toLowerCase() !== (initialLoginEmail ?? '').trim().toLowerCase();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const nameChanged = fullName.trim() !== initialFullName.trim();
      const messages: string[] = [];

      if (nameChanged) {
        const response = await fetch('/api/account/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName }),
        });
        const result = await response.json();
        if (!result.success) {
          setError(result.error ?? 'Enregistrement impossible');
          return;
        }
        messages.push('Profil enregistré.');
      }

      if (emailChanged) {
        if (!currentPassword) {
          setError('Indiquez votre mot de passe actuel pour modifier l’e-mail.');
          return;
        }
        const response = await fetch('/api/account/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail.trim(), currentPassword }),
        });
        const result = await response.json();
        if (!result.success) {
          setError(result.error ?? 'Impossible de modifier l’e-mail');
          return;
        }
        setCurrentPassword('');
        messages.push(
          result.data?.message ??
            'Un e-mail de confirmation a été envoyé à la nouvelle adresse.',
        );
      }

      if (messages.length === 0) {
        setSuccess('Aucune modification à enregistrer.');
        return;
      }

      setSuccess(messages.join(' '));
      router.refresh();
    } catch {
      setError('Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsForm onSubmit={(event) => void handleSubmit(event)}>
      <SettingsFormSection title="Profil" description="Les informations de votre compte utilisateur.">
        <SettingsFieldGrid>
          <TextField
            label="Nom de l’utilisateur"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <TextField
            label="E-mail de connexion"
            name="loginEmail"
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            autoComplete="email"
            hint="Un e-mail de confirmation sera envoyé à la nouvelle adresse."
          />
          {emailChanged ? (
            <div className="ops-field">
              <label htmlFor="account-email-password" className="ops-field-label">
                Mot de passe actuel
              </label>
              <PasswordInput
                id="account-email-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                required
                minLength={8}
              />
            </div>
          ) : null}
          {showAccessCode ? (
            <TextField
              label="Code d’accès Eveider"
              name="accessCode"
              value={accessCode ?? '—'}
              disabled
              hint="Fourni par Eveider. Lecture seule."
            />
          ) : null}
        </SettingsFieldGrid>
      </SettingsFormSection>

      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <SettingsFormActions>
        <Button type="submit" variant="primary" loading={saving}>
          Enregistrer
        </Button>
      </SettingsFormActions>
    </SettingsForm>
  );
}
