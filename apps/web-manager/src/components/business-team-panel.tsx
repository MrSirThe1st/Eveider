'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import {
  INVITABLE_ORGANIZATION_ROLES,
  ORGANIZATION_ROLE_LABELS,
  type OrganizationRole,
} from '@eveider/domain';
import { Button, ConfirmDialog, DataTable, InlineAlert, type DataTableColumn } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import type { TeamInviteView, TeamMemberView } from '@/server/team';

type BusinessTeamPanelProps = {
  members: TeamMemberView[];
  invites: TeamInviteView[];
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function BusinessTeamPanel({ members, invites }: BusinessTeamPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('dispatcher');
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
      const response = await fetch('/api/organisation/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
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

  async function handleRoleChange(memberId: string, nextRole: OrganizationRole) {
    setError(null);
    const response = await fetch(`/api/organisation/team/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Impossible de modifier le rôle');
      return;
    }
    await refresh();
  }

  async function handleResend(inviteId: string) {
    setError(null);
    const response = await fetch(`/api/organisation/team/invites/${inviteId}`, { method: 'POST' });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Impossible de renvoyer l’invitation');
      return;
    }
    setInviteUrl(result.data.invite.inviteUrl);
    setSuccess('Invitation renvoyée par email.');
    await refresh();
  }

  async function handleRevoke(inviteId: string) {
    setError(null);
    const response = await fetch(`/api/organisation/team/invites/${inviteId}`, { method: 'DELETE' });
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
      const response = await fetch(`/api/organisation/team/members/${removeId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de retirer ce membre');
        return;
      }
      setRemoveId(null);
      await refresh();
    } finally {
      setRemoving(false);
    }
  }

  const memberColumns = useMemo<DataTableColumn<TeamMemberView>[]>(
    () => [
      {
        id: 'name',
        header: 'Membre',
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
        cell: (row) => (
          <select
            aria-label={`Rôle de ${row.fullName ?? row.email ?? 'membre'}`}
            value={row.userRole}
            disabled={row.isCurrentUser}
            onChange={(event) => void handleRoleChange(row.id, event.target.value as OrganizationRole)}
            style={{ ...webInputStyle, height: 36, minWidth: 180 }}
          >
            {row.userRole === 'account_owner' ? (
              <option value="account_owner">{ORGANIZATION_ROLE_LABELS.account_owner}</option>
            ) : (
              INVITABLE_ORGANIZATION_ROLES.map((value) => (
                <option key={value} value={value}>
                  {ORGANIZATION_ROLE_LABELS[value]}
                </option>
              ))
            )}
          </select>
        ),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) =>
          row.isCurrentUser ? (
            <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>Vous</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setRemoveId(row.id)}>
              Retirer
            </Button>
          ),
      },
    ],
    [],
  );

  const inviteColumns = useMemo<DataTableColumn<TeamInviteView>[]>(
    () => [
      {
        id: 'email',
        header: 'Email',
        sortable: true,
        sortValue: (row) => row.email,
        cell: (row) => row.email,
      },
      {
        id: 'role',
        header: 'Rôle',
        cell: (row) => ORGANIZATION_ROLE_LABELS[row.invitedRole],
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
        cell: (row) => (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => void handleResend(row.id)}>
              Renvoyer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleRevoke(row.id)}>
              Révoquer
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}
      {inviteUrl ? <InlineAlert message={`Lien : ${inviteUrl}`} variant="info" /> : null}

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Inviter un membre</h2>
        <form onSubmit={handleInvite} style={{ display: 'grid', gap: '0.75rem', maxWidth: 640 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="marie@commerce.cd"
              style={webInputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Rôle</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as OrganizationRole)}
              style={{ ...webInputStyle, height: 44 }}
            >
              {INVITABLE_ORGANIZATION_ROLES.map((value) => (
                <option key={value} value={value}>
                  {ORGANIZATION_ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Envoi…' : 'Inviter'}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Membres</h2>
        <DataTable columns={memberColumns} rows={members} getRowId={(row) => row.id} />
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
        title="Retirer ce membre ?"
        description="La personne n’aura plus accès au tableau de bord de l’entreprise."
        confirmLabel="Retirer"
        tone="danger"
        loading={removing}
      />
    </div>
  );
}
