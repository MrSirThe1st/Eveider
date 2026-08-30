'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { Button, ConfirmDialog, DataTable, InlineAlert, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { adminDriverPath } from '@/lib/auth-routing';
import type { EveiderTeamInviteView, EveiderTeamMemberView } from '@/server/eveider-team';

type AdminEveiderTeamPanelProps = {
  dispatchers: EveiderTeamMemberView[];
  drivers: EveiderTeamMemberView[];
  invites: EveiderTeamInviteView[];
  canManage: boolean;
  addDriverHref: string;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function AdminEveiderTeamPanel({
  dispatchers,
  drivers,
  invites,
  canManage,
  addDriverHref,
}: AdminEveiderTeamPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  async function refresh() {
    router.refresh();
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setInviteUrl(null);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/eveider-team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible d’envoyer l’invitation');
        return;
      }
      setEmail('');
      setSuccess('Invitation envoyée par email.');
      setInviteUrl(result.data.invite.inviteUrl);
      await refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResend(inviteId: string) {
    setError(null);
    const response = await fetch(`/api/admin/eveider-team/invites/${inviteId}`, { method: 'POST' });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Impossible de renvoyer l’invitation');
      return;
    }
    setInviteUrl(result.data.invite.inviteUrl);
    setSuccess('Invitation renvoyée par email.');
    await refresh();
  }

  async function handleRevokeInvite(inviteId: string) {
    setError(null);
    const response = await fetch(`/api/admin/eveider-team/invites/${inviteId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Impossible de révoquer l’invitation');
      return;
    }
    await refresh();
  }

  async function confirmRemove() {
    if (!removeId) return;
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/eveider-team/members/${removeId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de retirer ce régulateur');
        return;
      }
      setRemoveId(null);
      setSuccess('Régulateur retiré.');
      await refresh();
    } finally {
      setRemoving(false);
    }
  }

  const dispatcherColumns = useMemo<DataTableColumn<EveiderTeamMemberView>[]>(
    () => [
      {
        id: 'name',
        header: 'Régulateur',
        sortable: true,
        sortValue: (row) => row.fullName ?? row.email ?? '',
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 600 }}>{row.fullName ?? '—'}</div>
            <div style={{ color: colors.textMuted, fontSize: '0.8125rem' }}>{row.email}</div>
          </div>
        ),
      },
      {
        id: 'role',
        header: 'Rôle',
        cell: (row) => row.roleLabel,
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) =>
          !canManage || row.isCurrentUser ? (
            row.isCurrentUser ? (
              <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>Vous</span>
            ) : null
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setRemoveId(row.id)}>
              Retirer
            </Button>
          ),
      },
    ],
    [canManage],
  );

  const driverColumns = useMemo<DataTableColumn<EveiderTeamMemberView>[]>(
    () => [
      {
        id: 'name',
        header: 'Chauffeur',
        sortable: true,
        sortValue: (row) => row.fullName ?? row.email ?? '',
        cell: (row) => (
          <div>
            {row.driverProfileId ? (
              <Link href={adminDriverPath(row.driverProfileId)} className="nb-data-table__link">
                {row.fullName ?? '—'}
              </Link>
            ) : (
              <div style={{ fontWeight: 600 }}>{row.fullName ?? '—'}</div>
            )}
            <div style={{ color: colors.textMuted, fontSize: '0.8125rem' }}>{row.email}</div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        cell: (row) => row.driverStatusLabel ?? '—',
      },
      {
        id: 'delivery',
        header: 'Livraison en cours',
        cell: (row) => row.currentDelivery ?? '—',
      },
    ],
    [],
  );

  const inviteColumns = useMemo<DataTableColumn<EveiderTeamInviteView>[]>(
    () => [
      {
        id: 'email',
        header: 'Email',
        sortable: true,
        sortValue: (row) => row.email,
        cell: (row) => row.email,
      },
      {
        id: 'expires',
        header: 'Expire le',
        cell: (row) => formatDate(row.expiresAt),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) =>
          canManage ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => void handleResend(row.id)}>
                Renvoyer
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void handleRevokeInvite(row.id)}>
                Révoquer
              </Button>
            </div>
          ) : null,
      },
    ],
    [canManage],
  );

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}
      {inviteUrl ? <InlineAlert message={`Lien : ${inviteUrl}`} variant="info" /> : null}

      {canManage ? (
        <section style={{ ...webCardStyle, padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Inviter un régulateur</h2>
          <form onSubmit={handleInvite} style={{ display: 'grid', gap: '0.75rem', maxWidth: 640 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="sarah@eveider.cd"
                style={webInputStyle}
              />
            </label>
            <div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Envoi…' : 'Inviter'}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.75rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Régulateurs</h2>
        </div>
        <DataTable columns={dispatcherColumns} rows={dispatchers} getRowId={(row) => row.id} />
      </section>

      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.75rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Chauffeurs</h2>
          {canManage ? (
            <Link href={addDriverHref} className="nb-btn nb-btn-secondary nb-btn--sm">
              Ajouter un chauffeur
            </Link>
          ) : null}
        </div>
        <DataTable columns={driverColumns} rows={drivers} getRowId={(row) => row.id} />
      </section>

      {invites.length > 0 ? (
        <section>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Invitations en attente</h2>
          <DataTable columns={inviteColumns} rows={invites} getRowId={(row) => row.id} />
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(removeId)}
        onClose={() => setRemoveId(null)}
        onConfirm={() => void confirmRemove()}
        title="Retirer ce régulateur ?"
        description="La personne n’aura plus accès au tableau de bord Eveider en tant que régulateur."
        confirmLabel="Retirer"
        tone="danger"
        loading={removing}
      />
    </div>
  );
}
