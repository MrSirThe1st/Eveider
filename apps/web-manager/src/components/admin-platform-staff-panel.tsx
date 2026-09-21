'use client';

import { webInputStyle } from '@eveider/config-ui';
import { PLATFORM_ROLE_LABELS, type PlatformRole } from '@eveider/domain';
import {
  Button,
  ConfirmDialog,
  DataTable,
  Disclosure,
  FilterToolbar,
  IconUsers,
  InlineAlert,
  Modal,
  PageFrame,
  StatusBadge,
  TableCellStack,
  type DataTableColumn,
  type DropdownMenuItem,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ListSearchField } from '@/components/list-search-field';
import { matchesListSearch } from '@/lib/list-search';
import { inviteCooldownButtonLabel, useInviteCooldowns } from '@/lib/invite-cooldown';
import type {
  PlatformStaffFormerMemberView,
  PlatformStaffInviteView,
  PlatformStaffMemberView,
} from '@/server/platform-staff';

type AdminPlatformStaffPanelProps = {
  members: PlatformStaffMemberView[];
  invites: PlatformStaffInviteView[];
  canManage: boolean;
  children?: ReactNode;
};

type TeamRowStatus = 'active' | 'pending';

type TeamRow = {
  id: string;
  kind: 'member' | 'invite';
  status: TeamRowStatus;
  primary: string;
  secondary: string | null;
  role: PlatformRole;
  roleLabel: string;
  member: PlatformStaffMemberView | null;
  invite: PlatformStaffInviteView | null;
};

const INVITE_ROLES: PlatformRole[] = ['admin', 'super_admin'];

const ROLE_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'admin', label: PLATFORM_ROLE_LABELS.admin },
  { value: 'super_admin', label: PLATFORM_ROLE_LABELS.super_admin },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actif' },
  { value: 'pending', label: 'Invitation en attente' },
];

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

function buildTeamRows(
  members: PlatformStaffMemberView[],
  invites: PlatformStaffInviteView[],
): TeamRow[] {
  const memberRows: TeamRow[] = members.map((member) => {
    const email = member.email?.trim() || '';
    const name = member.fullName?.trim() || null;
    return {
      id: `member:${member.id}`,
      kind: 'member',
      status: 'active',
      primary: name ?? (email || '—'),
      secondary: name && email ? email : null,
      role: member.platformRole,
      roleLabel: member.platformRoleLabel,
      member,
      invite: null,
    };
  });

  const inviteRows: TeamRow[] = invites.map((invite) => ({
    id: `invite:${invite.id}`,
    kind: 'invite',
    status: 'pending',
    primary: invite.email,
    secondary: `Invité le ${formatShortDate(invite.createdAt)}`,
    role: invite.invitedRole,
    roleLabel: invite.invitedRoleLabel,
    member: null,
    invite,
  }));

  return [...memberRows, ...inviteRows];
}

export function AdminPlatformStaffPanel({
  members,
  invites,
  canManage,
  children,
}: AdminPlatformStaffPanelProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [promoteMember, setPromoteMember] = useState<PlatformStaffMemberView | null>(null);
  const [promoteRole, setPromoteRole] = useState<PlatformRole>('admin');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PlatformRole>('admin');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const inviteCooldown = useInviteCooldowns('platform-staff');

  const rows = useMemo(() => buildTeamRows(members, invites), [members, invites]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (roleFilter !== 'all' && row.role !== roleFilter) return false;
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        return matchesListSearch(searchQuery, row.primary, row.secondary, row.roleLabel);
      }),
    [rows, roleFilter, statusFilter, searchQuery],
  );

  const filtersActive = searchQuery.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  async function refresh() {
    router.refresh();
  }

  function resetAlerts() {
    setError(null);
    setSuccess(null);
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
    if (!inviteCooldown.guard(inviteEmail)) return;
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
      inviteCooldown.start(inviteEmail, result.data?.invite?.id ?? '');
      setInviteOpen(false);
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

  async function handleResend(inviteId: string, inviteEmail?: string) {
    if (!inviteCooldown.guard(inviteId)) return;
    setError(null);
    const response = await fetch(`/api/admin/platform-staff/invites/${inviteId}`, { method: 'POST' });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Impossible de renvoyer l’invitation');
      return;
    }
    inviteCooldown.start(inviteId, inviteEmail ?? '');
    await refresh();
  }

  async function confirmCancelInvite() {
    if (!cancelInviteId) return;
    setRevoking(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/platform-staff/invites/${cancelInviteId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible d’annuler l’invitation');
        return;
      }
      setCancelInviteId(null);
      setSuccess('Invitation annulée.');
      await refresh();
    } finally {
      setRevoking(false);
    }
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

  const columns = useMemo<DataTableColumn<TeamRow>[]>(
    () => [
      {
        id: 'member',
        header: 'Membre',
        sortable: true,
        sortValue: (row) => `${row.kind === 'member' ? '0' : '1'}:${row.primary}`,
        cell: (row) => <TableCellStack primary={row.primary} secondary={row.secondary ?? undefined} />,
      },
      {
        id: 'role',
        header: 'Rôle',
        sortable: true,
        sortValue: (row) => row.roleLabel,
        cell: (row) => row.roleLabel,
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) =>
          row.status === 'active' ? (
            <StatusBadge tone="success">Actif</StatusBadge>
          ) : (
            <StatusBadge tone="warning">Invitation en attente</StatusBadge>
          ),
      },
    ],
    [],
  );

  function rowActions(row: TeamRow): DropdownMenuItem[] {
    if (!canManage) return [];
    if (row.member) {
      if (row.member.isCurrentUser) return [];
      return [
        {
          id: 'role',
          label: 'Modifier le rôle',
          onClick: () => openPromoteModal(row.member!),
        },
        {
          id: 'revoke',
          label: 'Révoquer l’accès',
          tone: 'danger',
          onClick: () => setRevokeId(row.member!.id),
        },
      ];
    }
    if (row.invite) {
      const remaining = inviteCooldown.remainingMs(row.invite.id);
      return [
        {
          id: 'resend',
          label: inviteCooldownButtonLabel('Renvoyer l’invitation', remaining),
          onClick: () => void handleResend(row.invite!.id, row.invite!.email),
        },
        {
          id: 'cancel',
          label: 'Annuler l’invitation',
          tone: 'danger',
          onClick: () => setCancelInviteId(row.invite!.id),
        },
      ];
    }
    return [];
  }

  const memberCountLabel = `${filteredRows.length} membre${filteredRows.length === 1 ? '' : 's'}`;

  return (
    <PageFrame
      title="Équipe"
      layout="wide"
      action={
        canManage ? (
          <Button type="button" size="sm" onClick={openInviteModal}>
            Inviter un membre
          </Button>
        ) : undefined
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        {inviteCooldown.waitMessage ? (
          <InlineAlert message={inviteCooldown.waitMessage} variant="info" autoDismissMs={0} />
        ) : error ? (
          <InlineAlert message={error} variant="error" />
        ) : success ? (
          <InlineAlert message={success} variant="success" />
        ) : null}

        <DataTable
          caption={memberCountLabel}
          columns={columns}
          rows={filteredRows}
          getRowId={(row) => row.id}
          initialSortId="member"
          rowActions={canManage ? rowActions : undefined}
          search={
            <ListSearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher par nom ou email..."
              ariaLabel="Rechercher par nom ou email"
            />
          }
          filters={
            <FilterToolbar
              embedded
              onClearAll={() => {
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              filters={[
                {
                  id: 'role',
                  label: 'Rôle',
                  value: roleFilter,
                  emptyValue: 'all',
                  options: ROLE_FILTERS,
                  onChange: setRoleFilter,
                },
                {
                  id: 'status',
                  label: 'Statut',
                  value: statusFilter,
                  emptyValue: 'all',
                  options: STATUS_FILTERS,
                  onChange: setStatusFilter,
                },
              ]}
            />
          }
          emptyTitle={filtersActive ? 'Aucun résultat' : 'Aucun membre'}
          emptyDescription={
            filtersActive
              ? 'Aucun membre ne correspond à la recherche actuelle.'
              : 'Invitez la première personne à rejoindre l’administration Eveider.'
          }
          emptyIcon={<IconUsers />}
        />

        {children}
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Inviter un membre"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="platform-staff-invite-form"
              disabled={saving || inviteCooldown.isCooling(inviteEmail)}
              loading={saving}
            >
              {saving ? 'Envoi…' : inviteCooldown.buttonLabel(inviteEmail, 'Inviter')}
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
              {INVITE_ROLES.map((value) => (
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
        title="Modifier le rôle"
        description={
          promoteMember
            ? `Rôle de ${promoteMember.fullName ?? promoteMember.email ?? 'ce membre'}.`
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
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Rôle</span>
          <select
            value={promoteRole}
            onChange={(event) => setPromoteRole(event.target.value as PlatformRole)}
            style={{ ...webInputStyle, height: 44 }}
          >
            {INVITE_ROLES.map((value) => (
              <option key={value} value={value}>
                {PLATFORM_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelInviteId)}
        onClose={() => setCancelInviteId(null)}
        onConfirm={() => void confirmCancelInvite()}
        title="Annuler l’invitation ?"
        description="Cette personne ne pourra plus rejoindre l’administration avec ce lien."
        confirmLabel="Annuler l’invitation"
        tone="danger"
        loading={revoking}
      />

      <ConfirmDialog
        open={Boolean(revokeId)}
        onClose={() => setRevokeId(null)}
        onConfirm={() => void confirmRevoke()}
        title="Révoquer l’accès ?"
        description="La personne n’aura plus accès au tableau de bord Eveider en tant qu’administrateur plateforme."
        confirmLabel="Révoquer l’accès"
        tone="danger"
        loading={revoking}
      />
    </PageFrame>
  );
}

export function AdminFormerStaffSection({
  members,
  canManage,
}: {
  members: PlatformStaffFormerMemberView[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inviteCooldown = useInviteCooldowns('platform-staff');

  const columns = useMemo<DataTableColumn<PlatformStaffFormerMemberView>[]>(
    () => [
      {
        id: 'member',
        header: 'Membre',
        sortable: true,
        sortValue: (row) => row.fullName ?? row.email ?? '',
        cell: (row) => (
          <TableCellStack
            primary={row.fullName?.trim() || row.email || '—'}
            secondary={row.fullName?.trim() && row.email ? row.email : undefined}
          />
        ),
      },
      {
        id: 'role',
        header: 'Ancien rôle',
        cell: (row) => row.formerRoleLabel,
      },
      {
        id: 'revoked',
        header: 'Révoqué le',
        cell: (row) => (row.revokedAt ? formatShortDate(row.revokedAt) : '—'),
      },
    ],
    [],
  );

  async function handleReinvite(member: PlatformStaffFormerMemberView) {
    if (!member.email) {
      setError('Impossible de réinviter : aucune adresse email.');
      return;
    }
    if (!inviteCooldown.guard(member.email)) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/platform-staff/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email, role: member.formerRole }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible d’envoyer l’invitation');
        return;
      }
      inviteCooldown.start(member.email, result.data?.invite?.id ?? '', member.id);
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  function rowActions(row: PlatformStaffFormerMemberView): DropdownMenuItem[] {
    if (!canManage || !row.email) return [];
    const remaining = inviteCooldown.remainingMs(row.email);
    return [
      {
        id: 'reinvite',
        label: inviteCooldownButtonLabel('Réinviter', remaining),
        disabled: saving,
        onClick: () => void handleReinvite(row),
      },
    ];
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {inviteCooldown.waitMessage ? (
        <InlineAlert message={inviteCooldown.waitMessage} variant="info" autoDismissMs={0} />
      ) : error ? (
        <InlineAlert message={error} variant="error" />
      ) : success ? (
        <InlineAlert message={success} variant="success" />
      ) : null}
      <Disclosure summary="Anciens membres">
        <div style={{ marginTop: '0.75rem' }}>
          <DataTable
            columns={columns}
            rows={members}
            getRowId={(row) => row.id}
            rowActions={canManage ? rowActions : undefined}
            emptyTitle="Aucun ancien membre"
          />
        </div>
      </Disclosure>
    </div>
  );
}
