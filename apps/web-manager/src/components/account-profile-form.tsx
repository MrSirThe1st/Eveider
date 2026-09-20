'use client';

import { Button, InlineAlert, TextField } from '@eveider/ui';
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
  loginEmail,
  accessCode = null,
  showAccessCode = false,
}: AccountProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
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
      setSuccess('Profil enregistré.');
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
            value={loginEmail ?? ''}
            disabled
            hint="L’e-mail de connexion ne peut pas être modifié ici."
          />
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
