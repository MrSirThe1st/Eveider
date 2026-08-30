'use client';

import { webCardStyle } from '@eveider/config-ui';
import { Button, InlineAlert, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

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
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: '1.5rem' }}>
      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>Profil</h3>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
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
          />
          {showAccessCode ? (
            <TextField
              label="Code d’accès Eveider"
              name="accessCode"
              value={accessCode ?? '—'}
              disabled
            />
          ) : null}
        </div>
      </section>

      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <div>
        <Button type="submit" variant="primary" loading={saving}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
