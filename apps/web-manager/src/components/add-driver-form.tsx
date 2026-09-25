'use client';

import { spacing, webInputStyle } from '@eveider/config-ui';
import { Button, Card, FileField, InlineAlert, Modal, PhoneField, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { writeInviteCooldown } from '@/lib/invite-cooldown';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';

type AddDriverFormProps = {
  apiPath: string;
  /** Base path for the driver details route (id is appended after create). */
  detailBasePath: string;
  submitLabel?: string;
  emailHint?: string;
  bodyExtras?: Record<string, unknown>;
  serviceAreas?: ServiceAreaOptionDto[];
  onCancel?: () => void;
  framed?: boolean;
};

export function AddDriverForm({
  apiPath,
  detailBasePath,
  submitLabel = 'Ajouter et inviter',
  emailHint = 'L’invitation part par email. Il crée son compte et choisit un mot de passe.',
  bodyExtras,
  serviceAreas = [],
  onCancel,
  framed = true,
}: AddDriverFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!idDocument) {
      setError('Ajoutez la pièce d’identité.');
      return;
    }
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('fullName', fullName);
      payload.append('email', email);
      if (phone.trim()) payload.append('phone', phone.trim());
      payload.append('idDocument', idDocument);
      if (serviceAreaId) payload.append('serviceAreaId', serviceAreaId);
      if (bodyExtras) {
        for (const [key, value] of Object.entries(bodyExtras)) {
          if (value == null) continue;
          payload.append(key, String(value));
        }
      }
      const response = await fetch(apiPath, {
        method: 'POST',
        body: payload,
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: { id: string; invited?: boolean };
      };
      if (!result.success || !result.data?.id) {
        setError(result.error ?? 'Impossible d’ajouter le chauffeur');
        return;
      }
      if (result.data.invited !== false) {
        writeInviteCooldown('driver', result.data.id);
      }
      router.push(`${detailBasePath}/${result.data.id}`);
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  const form = (
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
      <PhoneField
        label="Téléphone"
        name="phone"
        value={phone}
        onChange={setPhone}
        autoComplete="tel-national"
      />
      <FileField
        label="Pièce d’identité"
        name="idDocument"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        value={idDocument}
        onChange={setIdDocument}
        required
        maxSizeBytes={5 * 1024 * 1024}
        browseHint="JPEG, PNG, WebP ou PDF — 5 Mo max."
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
      <div
        style={{
          display: 'flex',
          justifyContent: onCancel ? 'flex-end' : 'flex-start',
          gap: spacing[2],
          flexWrap: 'wrap',
        }}
      >
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
        ) : null}
        <Button type="submit" loading={saving}>
          {saving ? 'Envoi…' : submitLabel}
        </Button>
      </div>
    </form>
  );

  if (!framed) return form;
  return <Card>{form}</Card>;
}

type AddDriverModalProps = Omit<AddDriverFormProps, 'framed' | 'onCancel'> & {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
};

export function AddDriverModal({
  open,
  onClose,
  title = 'Ajouter un chauffeur',
  description = 'Ajoutez un chauffeur Eveider. L’invitation part par email : il crée son compte, choisit un mot de passe, puis se connecte.',
  ...formProps
}: AddDriverModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} maxWidth={520}>
      <AddDriverForm {...formProps} framed={false} onCancel={onClose} />
    </Modal>
  );
}
