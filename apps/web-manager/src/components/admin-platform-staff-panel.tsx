'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { PLATFORM_ROLES, PLATFORM_ROLE_LABELS, type PlatformRole } from '@eveider/domain';
import { Button, ConfirmDialog, DataTable, InlineAlert, type DataTableColumn } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import type { PlatformStaffInviteView, PlatformStaffMemberView } from '@/server/platform-staff';

type AdminPlatformStaffPanelProps = {
  members: PlatformStaffMemberView[];
  invites: PlatformStaffInviteView[];
  canManage: boolean;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function AdminPlatformStaffPanel({
  members,
  invites,
  canManage,
}: AdminPlatformStaffPanelProps) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PlatformRole>('admin');
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteRole, setPromoteRole] = useState<PlatformRole>('admin');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

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
      const response = await fetch('/api/admin/platform-staff/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible d’envoyer l’invitation');
        return;
      }
      setInviteEmail('');
      setSuccess('Invitation envoyée par email.');
      setInviteUrl(result.data.invite.inviteUrl);
      await refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePromote(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/platform-staff/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: promoteEmail, role: promoteRole }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de promouvoir ce compte');
        return;
      }
      setPromoteEmail('');
      setSuccess('Accès administrateur accordé.');
      await refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(memberId: string, nextRole: PlatformRole) {
    setError(null);
    const response = await fetch(`/api/admin/platform-staff/members/${memberId}`, {
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
    const response = await fetch(`/api/admin/platform-staff/invites/${inviteId}`, { method: 'POST' });
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
    const response = await fetch(`/api/admin/platform-staff/invites/${inviteId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Impossible de révoquer l’invitation');
      return;
    }
    await refresh();
  }

  async function confirmRevoke() {
    if (!revokeId) return;
    setRevoking(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/platform-staff/members/${revokeId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de révoquer l’accès');
        return;
      }
      setRevokeId(null);
      setSuccess('Accès administrateur révoqué.');
      await refresh();
    } finally {
      setRevoking(false);
    }
  }

  const memberColumns = useMemo<DataTableColumn<PlatformStaffMemberView>[]>(
    () => [
      {
        id: 'name',
        header: 'Administrateur',
        sortable: true,
        sortValue: (row) => row.fullName ?? row.email ?? '',
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 600 }}>{row.fullName ?? '—'}</div>
            <div style={{ color: colors.textMuted, fontSize: '0.8125rem' }}>{row.email}</div>
            {row.eveiderOrgRoleLabel ? (
              <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: 4 }}>
                Org Eveider : {row.eveiderOrgRoleLabel}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'role',
        header: 'Rôle plateforme',
        cell: (row) =>
          canManage && !row.isCurrentUser ? (
            <select
              aria-label={`Rôle de ${row.fullName ?? row.email ?? 'administrateur'}`}
              value={row.platformRole}
              onChange={(event) => void handleRoleChange(row.id, event.target.value as PlatformRole)}
              style={{ ...webInputStyle, height: 36, minWidth: 200 }}
            >
              {PLATFORM_ROLES.map((value) => (
                <option key={value} value={value}>
                  {PLATFORM_ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          ) : (
            row.platformRoleLabel
          ),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) =>
          !canManage ? null : row.isCurrentUser ? (
            <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>Vous</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setRevokeId(row.id)}>
              Révoquer
            </Button>
          ),
      },
    ],
    [canManage],
  );

  const inviteColumns = useMemo<DataTableColumn<PlatformStaffInviteView>[]>(
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
        cell: (row) => row.invitedRoleLabel,
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

      {!canManage ? (
        <InlineAlert
          message="Seul un super administrateur peut inviter ou modifier les accès plateforme."
          variant="info"
        />
      ) : null}

      {canManage ? (
        <>
          <section style={{ ...webCardStyle, padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Inviter par email</h2>
            <form onSubmit={handleInvite} style={{ display: 'grid', gap: '0.75rem', maxWidth: 640 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Email</span>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="marie@eveider.cd"
                  style={webInputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Rôle</span>
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as PlatformRole)}
                  style={{ ...webInputStyle, height: 44 }}
                >
                  {PLATFORM_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {PLATFORM_ROLE_LABELS[value]}
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

          <section style={{ ...webCardStyle, padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Promouvoir un compte existant</h2>
            <form onSubmit={handlePromote} style={{ display: 'grid', gap: '0.75rem', maxWidth: 640 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Email du compte</span>
                <input
                  type="email"
                  required
                  value={promoteEmail}
                  onChange={(event) => setPromoteEmail(event.target.value)}
                  placeholder="david@eveider.cd"
                  style={webInputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Rôle</span>
                <select
                  value={promoteRole}
                  onChange={(event) => setPromoteRole(event.target.value as PlatformRole)}
                  style={{ ...webInputStyle, height: 44 }}
                >
                  {PLATFORM_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {PLATFORM_ROLE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <Button type="submit" variant="secondary" disabled={saving}>
                  {saving ? 'Traitement…' : 'Accorder l’accès'}
                </Button>
              </div>
            </form>
          </section>
        </>
      ) : null}

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Administrateurs plateforme</h2>
        <DataTable columns={memberColumns} rows={members} getRowId={(row) => row.id} />
      </section>

      {invites.length > 0 ? (
        <section>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Invitations en attente</h2>
          <DataTable columns={inviteColumns} rows={invites} getRowId={(row) => row.id} />
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(revokeId)}
        onClose={() => setRevokeId(null)}
        onConfirm={() => void confirmRevoke()}
        title="Révoquer l’accès administrateur ?"
        description="La personne n’aura plus accès au tableau de bord Eveider en tant qu’administrateur plateforme."
        confirmLabel="Révoquer"
        tone="danger"
        loading={revoking}
      />
    </div>
  );
}
