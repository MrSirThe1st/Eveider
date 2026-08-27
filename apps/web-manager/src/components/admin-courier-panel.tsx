'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { Button, DataTable, InlineAlert, type DataTableColumn } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import type { CourierDossierView } from '@/server/couriers';

type AdminCourierPanelProps = {
  dossiers: CourierDossierView[];
};

export function AdminCourierPanel({ dossiers }: AdminCourierPanelProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function post(url: string, body?: unknown, okMessage?: string) {
    setError(null);
    setSuccess(null);
    const response = await fetch(url, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Action impossible');
      return;
    }
    if (okMessage) setSuccess(okMessage);
    router.refresh();
  }

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
        id: 'contractor',
        header: 'Contractant',
        cell: (row) => (row.contractorType === 'eveider' ? 'Flotte Eveider' : 'Entreprise'),
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {row.status === 'pending_review' ? (
              <>
                <Button size="sm" onClick={() => void post(`/api/admin/driver-dossiers/${row.id}/review`, { status: 'approved' }, 'Dossier approuvé.')}>
                  Approuver
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void post(`/api/admin/driver-dossiers/${row.id}/review`, { status: 'needs_correction' }, 'Correction demandée.')}>
                  Corriger
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void post(`/api/admin/driver-dossiers/${row.id}/review`, { status: 'rejected' }, 'Dossier rejeté.')}>
                  Rejeter
                </Button>
              </>
            ) : null}
            {row.status === 'approved' ? (
              <Button size="sm" onClick={() => void post(`/api/admin/driver-dossiers/${row.id}/invite`, undefined, 'Invitation mobile envoyée.')}>
                Inviter
              </Button>
            ) : null}
            {row.status === 'deactivated' ? (
              <Button size="sm" variant="secondary" onClick={() => void post(`/api/admin/driver-dossiers/${row.id}/reactivate`, undefined, 'Compte réactivé.')}>
                Réactiver
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    await post(
      '/api/admin/driver-dossiers',
      { fullName, email, idDocumentUrl, contractorType: 'eveider' },
      'Dossier flotte créé.',
    );
    setFullName('');
    setEmail('');
    setIdDocumentUrl('');
    setSaving(false);
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}
      <form onSubmit={(e) => void handleCreate(e)} style={{ ...webCardStyle, padding: '1.25rem', display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Coursier flotte Eveider</h2>
        <input style={webInputStyle} placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input style={webInputStyle} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={webInputStyle} placeholder="URL pièce d’identité" value={idDocumentUrl} onChange={(e) => setIdDocumentUrl(e.target.value)} required />
        <Button type="submit" disabled={saving}>{saving ? 'Création…' : 'Créer le dossier'}</Button>
      </form>
      <DataTable
        columns={columns}
        rows={dossiers}
        getRowId={(row) => row.id}
        emptyTitle="Aucun dossier coursier."
      />
      <p style={{ color: colors.textMuted, fontSize: 13 }}>
        Désactivé = le coursier a fermé son compte. Bloqué = sanction admin, distincte.
      </p>
    </div>
  );
}
