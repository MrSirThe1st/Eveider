'use client';

import { webInputStyle } from '@eveider/config-ui';
import {
  INVITABLE_ORGANIZATION_ROLES,
  ORGANIZATION_ROLE_LABELS,
  type OrganizationRole,
} from '@eveider/domain';
import {
  Button,
  ConfirmDialog,
  DataTable,
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
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { ListSearchField } from '@/components/list-search-field';
import { inviteCooldownButtonLabel, useInviteCooldowns } from '@/lib/invite-cooldown';
import { matchesListSearch } from '@/lib/list-search';
import type { TeamInviteView, TeamMemberView } from '@/server/team';

type BusinessTeamPanelProps = {
  members: TeamMemberView[];
  invites: TeamInviteView[];
};

type TeamRowStatus = 'active' | 'pending';

type TeamRow = {
  id: string;
  kind: 'member' | 'invite';
  status: TeamRowStatus;
  primary: string;
  secondary: string | null;
  role: OrganizationRole;
  roleLabel: string;
  member: TeamMemberView | null;
  invite: TeamInviteView | null;
};

const ROLE_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'account_owner', label: ORGANIZATION_ROLE_LABELS.account_owner },
  { value: 'admin', label: ORGANIZATION_ROLE_LABELS.admin },
  { value: 'dispatcher', label: ORGANIZATION_ROLE_LABELS.dispatcher },
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

function buildTeamRows(members: TeamMemberView[], invites: TeamInviteView[]): TeamRow[] {
  const memberRows: TeamRow[] = members.map((member) => {
    const email = member.email?.trim() || '';
    const name = member.fullName?.trim() || null;
    return {
      id: `member:${member.id}`,
      kind: 'member',
      status: 'active',
      primary: name ?? (email || '—'),
      secondary: name && email ? email : null,
      role: member.userRole,
      roleLabel: ORGANIZATION_ROLE_LABELS[member.userRole],
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
    roleLabel: ORGANIZATION_ROLE_LABELS[invite.invitedRole],
    member: null,
    invite,
  }));

  return [...memberRows, ...inviteRows];
}

export function BusinessTeamPanel({ members, invites }: BusinessTeamPanelProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMemberView | null>(null);
  const [editRole, setEditRole] = useState<OrganizationRole>('dispatcher');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('dispatcher');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const inviteCooldown = useInviteCooldowns('org-team');

  const closeInviteModal = useCallback(() => setInviteOpen(false), []);
  const closeEditRoleModal = useCallback(() => setEditMember(null), []);

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
    setInviteRole('dispatcher');
    setInviteOpen(true);
  }

  function openEditRoleModal(member: TeamMemberView) {
    resetAlerts();
    setEditMember(member);
    setEditRole(member.userRole === 'account_owner' ? 'admin' : member.userRole);
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteCooldown.guard(inviteEmail)) return;
    resetAlerts();
    setSaving(true);
    try {
      const response = await fetch('/api/organisation/team/invites', {
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

  async function handleRoleConfirm() {
    if (!editMember) return;
    resetAlerts();
    setSaving(true);
    try {
      const response = await fetch(`/api/organisation/team/members/${editMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de modifier le rôle');
        return;
      }
      setEditMember(null);
      setSuccess('Rôle mis à jour.');
      await refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResend(inviteId: string, email?: string) {
    if (!inviteCooldown.guard(inviteId)) return;
    setError(null);
    const response = await fetch(`/api/organisation/team/invites/${inviteId}`, { method: 'POST' });
    const result = await response.json();
    if (!result.success) {
      setError(result.error ?? 'Impossible de renvoyer l’invitation');
      return;
    }
    inviteCooldown.start(inviteId, email ?? '');
    await refresh();
  }

  async function confirmCancelInvite() {
    if (!cancelInviteId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/organisation/team/invites/${cancelInviteId}`, {
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
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removeId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/organisation/team/members/${removeId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de retirer ce membre');
        return;
      }
      setRemoveId(null);
      setSuccess('Membre retiré.');
      await refresh();
    } finally {
      setBusy(false);
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
    if (row.member) {
      if (row.member.isCurrentUser) return [];
      const actions: DropdownMenuItem[] = [];
      if (row.member.userRole !== 'account_owner') {
        actions.push({
          id: 'role',
          label: 'Modifier le rôle',
          onClick: () => openEditRoleModal(row.member!),
        });
      }
      actions.push({
        id: 'remove',
        label: 'Retirer',
        tone: 'danger',
        onClick: () => setRemoveId(row.member!.id),
      });
      return actions;
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
        <Button type="button" size="sm" onClick={openInviteModal}>
          Inviter un membre
        </Button>
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        {inviteCooldown.waitMessage ? (
          <InlineAlert message={inviteCooldown.waitMessage} variant="info" autoDismissMs={0} />
        ) : error ? (
          <InlineAlert message={error} variant="error" onDismiss={() => setError(null)} />
        ) : success ? (
          <InlineAlert message={success} variant="success" onDismiss={() => setSuccess(null)} />
        ) : null}

        <DataTable
          caption={memberCountLabel}
          columns={columns}
          rows={filteredRows}
          getRowId={(row) => row.id}
          initialSortId="member"
          rowActions={rowActions}
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
              : 'Invitez la première personne à rejoindre votre entreprise.'
          }
          emptyIcon={<IconUsers />}
        />
      </div>

      <Modal
        open={inviteOpen}
        onClose={closeInviteModal}
        title="Inviter un membre"
        footer={
          <>
            <Button variant="ghost" onClick={closeInviteModal} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="business-team-invite-form"
              disabled={saving || inviteCooldown.isCooling(inviteEmail)}
              loading={saving}
            >
              {saving ? 'Envoi…' : inviteCooldown.buttonLabel(inviteEmail, 'Inviter')}
            </Button>
          </>
        }
      >
        <form id="business-team-invite-form" onSubmit={handleInvite} style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Email</span>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="marie@commerce.cd"
              style={webInputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Rôle</span>
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as OrganizationRole)}
              style={{ ...webInputStyle, height: 44 }}
            >
              {INVITABLE_ORGANIZATION_ROLES.map((value) => (
                <option key={value} value={value}>
                  {ORGANIZATION_ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(editMember)}
        onClose={closeEditRoleModal}
        title="Modifier le rôle"
        description={
          editMember
            ? `Rôle de ${editMember.fullName ?? editMember.email ?? 'ce membre'}.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeEditRoleModal} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={() => void handleRoleConfirm()} disabled={saving} loading={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Rôle</span>
          <select
            value={editRole}
            onChange={(event) => setEditRole(event.target.value as OrganizationRole)}
            style={{ ...webInputStyle, height: 44 }}
          >
            {INVITABLE_ORGANIZATION_ROLES.map((value) => (
              <option key={value} value={value}>
                {ORGANIZATION_ROLE_LABELS[value]}
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
        description="Cette personne ne pourra plus rejoindre votre entreprise avec ce lien."
        confirmLabel="Annuler l’invitation"
        tone="danger"
        loading={busy}
      />

      <ConfirmDialog
        open={Boolean(removeId)}
        onClose={() => setRemoveId(null)}
        onConfirm={() => void confirmRemove()}
        title="Retirer ce membre ?"
        description="La personne n’aura plus accès au tableau de bord de l’entreprise."
        confirmLabel="Retirer"
        tone="danger"
        loading={busy}
      />
    </PageFrame>
  );
}
