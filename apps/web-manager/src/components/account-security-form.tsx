'use client';

import { colors, spacing, typography, webCardStyle } from '@eveider/config-ui';
import { Button, InlineAlert, PasswordInput } from '@eveider/ui';
import { useState, type FormEvent } from 'react';

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: typography.label.fontSize,
        fontWeight: typography.label.fontWeight,
        color: colors.secondary,
      }}
    >
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
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: '1.5rem' }}>
      <section style={{ ...webCardStyle, padding: '1.5rem', display: 'grid', gap: spacing[4] }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Mot de passe</h3>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted, fontSize: '0.875rem' }}>
            Utilisez au moins 8 caractères. Vous devez confirmer votre mot de passe actuel.
          </p>
        </div>

        <div style={{ display: 'grid', gap: spacing[3], maxWidth: 420 }}>
          <div>
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
          <div>
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
          <div>
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
      </section>

      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <div>
        <Button type="submit" variant="primary" loading={saving}>
          Mettre à jour le mot de passe
        </Button>
      </div>
    </form>
  );
}
