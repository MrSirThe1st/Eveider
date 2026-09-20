'use client';

import { Button, InlineAlert, PasswordInput } from '@eveider/ui';
import { useState, type FormEvent } from 'react';
import { SettingsForm, SettingsFormActions, SettingsFormSection } from '@/components/ops-ui';

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="ops-field-label">
      {children}
    </label>
  );
}

export function AccountSecurityForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de modifier le mot de passe');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Mot de passe mis à jour.');
    } catch {
      setError('Impossible de modifier le mot de passe.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsForm onSubmit={(event) => void handleSubmit(event)}>
      <SettingsFormSection
        title="Mot de passe"
        description="Utilisez au moins 8 caractères. Vous devez confirmer votre mot de passe actuel."
      >
        <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
          <div className="ops-field">
            <FieldLabel htmlFor="account-current-password">Mot de passe actuel</FieldLabel>
            <PasswordInput
              id="account-current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              required
              minLength={8}
            />
          </div>
          <div className="ops-field">
            <FieldLabel htmlFor="account-new-password">Nouveau mot de passe</FieldLabel>
            <PasswordInput
              id="account-new-password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="ops-field">
            <FieldLabel htmlFor="account-confirm-password">Confirmer le nouveau mot de passe</FieldLabel>
            <PasswordInput
              id="account-confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
        </div>
      </SettingsFormSection>

      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <SettingsFormActions>
        <Button type="submit" variant="primary" loading={saving}>
          Mettre à jour le mot de passe
        </Button>
      </SettingsFormActions>
    </SettingsForm>
  );
}
