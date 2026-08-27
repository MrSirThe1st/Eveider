'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { Button, DataTable, InlineAlert, type DataTableColumn } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import type { CourierDossierView } from '@/server/couriers';

type BusinessCourierPanelProps = {
  dossiers: CourierDossierView[];
};

export function BusinessCourierPanel({ dossiers }: BusinessCourierPanelProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const columns = useMemo<DataTableColumn<CourierDossierView>[]>(
    () => [
      {
        id: 'fullName',
        header: 'Nom',
        cell: (row) => row.fullName,
      },
      {
        id: 'email',
        header: 'Email',
        cell: (row) => row.email,
      },
      {
        id: 'status',
        header: 'Statut',
        cell: (row) => row.statusLabel,
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <div style={{ display: 'flex', gap: 8 }}>
            {row.status === 'approved' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void act(`/api/organisation/drivers/${row.id}/invite`, 'Invitation envoyée.')}
              >
                Inviter
              </Button>
            ) : null}
            {row.status === 'deactivated' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void act(`/api/organisation/drivers/${row.id}/reactivate`, 'Coursier réactivé.')}
              >
                Réactiver
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  async function act(url: string, okMessage: string) {
    setError(null);
    setSuccess(null);
    const response = await fetch(url, { method: 'POST' });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Action impossible');
      return;
    }
    setSuccess(okMessage);
    router.refresh();
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const response = await fetch('/api/organisation/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, idDocumentUrl }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de créer le dossier');
        return;
      }
      setFullName('');
      setEmail('');
      setPhone('');
      setIdDocumentUrl('');
      setSuccess('Dossier envoyé pour revue Eveider.');
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <form onSubmit={(e) => void handleCreate(e)} style={{ ...webCardStyle, padding: '1.25rem', display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Nouveau coursier</h2>
        <input style={webInputStyle} placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input style={webInputStyle} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={webInputStyle} placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input style={webInputStyle} placeholder="URL pièce d’identité" value={idDocumentUrl} onChange={(e) => setIdDocumentUrl(e.target.value)} required />
        <Button type="submit" disabled={saving}>{saving ? 'Envoi…' : 'Soumettre le dossier'}</Button>
      </form>

      <DataTable
        columns={columns}
        rows={dossiers}
        getRowId={(row) => row.id}
        emptyTitle="Aucun coursier pour le moment."
      />
      <p style={{ color: colors.textMuted, fontSize: 13 }}>
        Statut « Désactivé » : le coursier a fermé son compte. « Bloqué » reste une sanction admin distincte.
      </p>
    </div>
  );
}
