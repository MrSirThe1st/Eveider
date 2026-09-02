'use client';

import { colors, webInputStyle } from '@eveider/config-ui';
import { PLATFORM_ROLES, PLATFORM_ROLE_LABELS, type PlatformRole } from '@eveider/domain';
import {
  Button,
  ConfirmDialog,
  DataTable,
  InlineAlert,
  Modal,
  type DataTableColumn,
  type DropdownMenuItem,
} from '@eveider/ui';
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [promoteMember, setPromoteMember] = useState<PlatformStaffMemberView | null>(null);
  const [promoteRole, setPromoteRole] = useState<PlatformRole>('admin');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PlatformRole>('admin');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function refresh() {
    router.refresh();
  }

  function resetAlerts() {
    setError(null);
    setSuccess(null);
    setInviteUrl(null);
  }

  function openInviteModal() {
    resetAlerts();
    setInviteEmail('');
    setInviteRole('admin');
    setInviteOpen(true);
  }

  function openPromoteModal(member: PlatformStaffMemberView) {
    resetAlerts();
    setPromoteMember(member);
    setPromoteRole(member.platformRole);
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    resetAlerts();
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
      setInviteOpen(false);
      setSuccess('Invitation envoyée par email.');
      setInviteUrl(result.data.invite.inviteUrl);
      await refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePromoteConfirm() {
    if (!promoteMember) return;
    resetAlerts();
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/platform-staff/members/${promoteMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: promoteRole }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de modifier le rôle');
        return;
      }
      setPromoteMember(null);
      setSuccess('Rôle mis à jour.');
      await refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
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
        cell: (row) => row.platformRoleLabel,
      },
    ],
    [],
  );

  const rowActions = useMemo(
    () =>
      canManage
        ? (row: PlatformStaffMemberView): DropdownMenuItem[] => {
            if (row.isCurrentUser) return [];
            return [
              {
                id: 'promote',
                label: 'Promouvoir',
                onClick: () => openPromoteModal(row),
              },
              {
                id: 'revoke',
                label: 'Révoquer',
                tone: 'danger',
                onClick: () => setRevokeId(row.id),
              },
            ];
          }
        : undefined,
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
    ],
    [],
  );

  const inviteRowActions = useMemo(
    () =>
      canManage
        ? (row: PlatformStaffInviteView): DropdownMenuItem[] => [
            {
              id: 'resend',
              label: 'Renvoyer',
              onClick: () => void handleResend(row.id),
            },
            {
              id: 'revoke',
              label: 'Révoquer',
              tone: 'danger',
              onClick: () => void handleRevokeInvite(row.id),
            },
          ]
        : undefined,
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

      <DataTable
        caption={`${members.length} administrateur${members.length === 1 ? '' : 's'}`}
        columns={memberColumns}
        rows={members}
        getRowId={(row) => row.id}
        rowActions={rowActions}
        toolbar={
          canManage ? (
            <Button type="button" size="sm" onClick={openInviteModal}>
              Ajouter
            </Button>
          ) : undefined
        }
      />

      {invites.length > 0 ? (
        <DataTable
          caption="Invitations en attente"
          columns={inviteColumns}
          rows={invites}
          getRowId={(row) => row.id}
          rowActions={inviteRowActions}
        />
      ) : null}

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Inviter par email"
        description="Envoyez une invitation pour rejoindre l’administration plateforme Eveider."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" form="platform-staff-invite-form" disabled={saving}>
              {saving ? 'Envoi…' : 'Inviter'}
            </Button>
          </>
        }
      >
        <form id="platform-staff-invite-form" onSubmit={handleInvite} style={{ display: 'grid', gap: '0.75rem' }}>
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
        </form>
      </Modal>

      <Modal
        open={Boolean(promoteMember)}
        onClose={() => setPromoteMember(null)}
        title="Promouvoir"
        description={
          promoteMember
            ? `Modifier le rôle plateforme de ${promoteMember.fullName ?? promoteMember.email ?? 'cet administrateur'}.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPromoteMember(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={() => void handlePromoteConfirm()} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Rôle plateforme</span>
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
      </Modal>

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
