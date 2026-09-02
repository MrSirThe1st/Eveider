'use client';

import { spacing, webInputStyle } from '@eveider/config-ui';
import { Button, Card, InlineAlert, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';

type AddDriverFormProps = {
  apiPath: string;
  /** Base path for the driver details route (id is appended after create). */
  detailBasePath: string;
  submitLabel?: string;
  emailHint?: string;
  bodyExtras?: Record<string, unknown>;
  serviceAreas?: ServiceAreaOptionDto[];
};

export function AddDriverForm({
  apiPath,
  detailBasePath,
  submitLabel = 'Ajouter et inviter',
  emailHint = 'L’invitation part tout de suite sur le téléphone. Il ne pourra pas livrer tant qu’Eveider n’a pas contrôlé ses pièces.',
  bodyExtras,
  serviceAreas = [],
}: AddDriverFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone.trim() || undefined,
          idDocumentUrl,
          ...(serviceAreaId ? { serviceAreaId } : {}),
          ...bodyExtras,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: { id: string };
      };
      if (!result.success || !result.data?.id) {
        setError(result.error ?? 'Impossible d’ajouter le chauffeur');
        return;
      }
      router.push(`${detailBasePath}/${result.data.id}`);
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: spacing[4] }}>
        {error ? <InlineAlert message={error} variant="error" /> : null}
        <TextField
          label="Nom complet"
          name="fullName"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          autoComplete="name"
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          hint={emailHint}
        />
        <TextField
          label="Téléphone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
        />
        <TextField
          label="URL de la pièce d’identité"
          name="idDocumentUrl"
          type="url"
          value={idDocumentUrl}
          onChange={(event) => setIdDocumentUrl(event.target.value)}
          required
          hint="Lien vers le recto de la pièce d’identité."
        />
        {serviceAreas.length > 0 ? (
          <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem', fontWeight: 600 }}>
            Zone de service
            <select
              value={serviceAreaId}
              onChange={(event) => setServiceAreaId(event.target.value)}
              aria-label="Zone de service"
              style={{
                ...webInputStyle,
                height: 42,
                padding: '0 10px',
                fontWeight: 500,
              }}
            >
              <option value="">Non assignée</option>
              {serviceAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div>
          <Button type="submit" loading={saving}>
            {saving ? 'Envoi…' : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
