'use client';

import { colors, webInputStyle } from '@eveider/config-ui';
import {
  Button,
  ConfirmDialog,
  DataTable,
  InlineAlert,
  Modal,
  type DataTableColumn,
  type DropdownMenuItem,
} from '@eveider/ui';
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteDriverId, setPromoteDriverId] = useState<string | null>(null);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [driverZoneFilter, setDriverZoneFilter] = useState('all');

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
    setInviteOpen(true);
  }

  function openPromoteModal(member?: EveiderTeamMemberView) {
    resetAlerts();
    setPromoteDriverId(member?.role === 'driver' ? member.id : null);
    setPromoteEmail(member?.email ?? '');
    setPromoteOpen(true);
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    resetAlerts();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/eveider-team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
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

  async function handlePromoteByEmail(event: FormEvent) {
    event.preventDefault();
    resetAlerts();
    setSaving(true);
    try {
      if (promoteDriverId) {
        const response = await fetch(`/api/admin/eveider-team/members/${promoteDriverId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'dispatcher' }),
        });
        const result = await response.json();
        if (!result.success) {
          setError(result.error ?? 'Impossible de promouvoir ce chauffeur');
          return;
        }
      } else {
        const response = await fetch('/api/admin/eveider-team/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: promoteEmail }),
        });
        const result = await response.json();
        if (!result.success) {
          setError(result.error ?? 'Impossible de promouvoir ce compte');
          return;
        }
      }
      setPromoteOpen(false);
      setPromoteDriverId(null);
      setSuccess('Dispatcher ajouté.');
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

  async function confirmRevoke() {
    if (!revokeId) return;
    setRevoking(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/eveider-team/members/${revokeId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de retirer ce membre');
        return;
      }
      setRevokeId(null);
      setSuccess('Membre retiré de l’équipe Eveider.');
      await refresh();
    } finally {
      setRevoking(false);
    }
  }

  const dispatcherColumns = useMemo<DataTableColumn<EveiderTeamMemberView>[]>(
    () => [
      {
        id: 'name',
        header: 'Dispatcher',
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
    ],
    [],
  );

  const dispatcherRowActions = useMemo(
    () =>
      canManage
        ? (row: EveiderTeamMemberView): DropdownMenuItem[] => {
            if (row.isCurrentUser) return [];
            return [
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

  const driverZoneOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
      if (driver.serviceAreaId && driver.serviceAreaName) {
        map.set(driver.serviceAreaId, driver.serviceAreaName);
      }
    }
    return [
      { value: 'all', label: 'Toutes les zones' },
      { value: 'none', label: 'Non assignée' },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      if (driverZoneFilter === 'none') return !driver.serviceAreaId;
      if (driverZoneFilter !== 'all' && driver.serviceAreaId !== driverZoneFilter) return false;
      return true;
    });
  }, [drivers, driverZoneFilter]);

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
        id: 'zone',
        header: 'Zone',
        sortable: true,
        sortValue: (row) => row.serviceAreaName ?? '',
        cell: (row) => row.serviceAreaName ?? '—',
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

  const driverRowActions = useMemo(
    () =>
      canManage
        ? (row: EveiderTeamMemberView): DropdownMenuItem[] => {
            const items: DropdownMenuItem[] = [
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
            if (row.driverProfileId) {
              items.unshift({
                id: 'profile',
                label: 'Voir la fiche',
                href: adminDriverPath(row.driverProfileId),
              });
            }
            return items;
          }
        : undefined,
    [canManage],
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
    ],
    [],
  );

  const inviteRowActions = useMemo(
    () =>
      canManage
        ? (row: EveiderTeamInviteView): DropdownMenuItem[] => [
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

  const promoteModalTitle = promoteDriverId ? 'Promouvoir en dispatcher' : 'Promouvoir un compte existant';
  const promoteModalDescription = promoteDriverId
    ? 'Ce chauffeur aura accès au tableau de bord Eveider en tant que dispatcher.'
    : 'Accordez le rôle dispatcher à un compte Eveider existant.';

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}
      {inviteUrl ? <InlineAlert message={`Lien : ${inviteUrl}`} variant="info" /> : null}

      <DataTable
        caption={`${dispatchers.length} dispatcher${dispatchers.length === 1 ? '' : 's'}`}
        columns={dispatcherColumns}
        rows={dispatchers}
        getRowId={(row) => row.id}
        rowActions={dispatcherRowActions}
        toolbar={
          canManage ? (
            <Button type="button" size="sm" onClick={openInviteModal}>
              Ajouter
            </Button>
          ) : undefined
        }
      />

      <DataTable
        caption={`${filteredDrivers.length} chauffeur${filteredDrivers.length === 1 ? '' : 's'}`}
        columns={driverColumns}
        rows={filteredDrivers}
        getRowId={(row) => row.id}
        rowActions={driverRowActions}
        toolbar={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {driverZoneOptions.length > 2 ? (
              <select
                value={driverZoneFilter}
                onChange={(event) => setDriverZoneFilter(event.target.value)}
                aria-label="Filtrer les chauffeurs par zone de service"
                style={{
                  ...webInputStyle,
                  height: 36,
                  padding: '0 10px',
                  minWidth: 180,
                }}
              >
                {driverZoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
            {canManage ? (
              <Link href={addDriverHref} className="nb-btn nb-btn-primary nb-btn--sm">
                Ajouter
              </Link>
            ) : null}
          </div>
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
        description="Envoyez une invitation pour rejoindre l’équipe Eveider en tant que dispatcher."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" form="eveider-team-invite-form" disabled={saving}>
              {saving ? 'Envoi…' : 'Inviter'}
            </Button>
          </>
        }
      >
        <form id="eveider-team-invite-form" onSubmit={handleInvite} style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Email</span>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="sarah@eveider.cd"
              style={webInputStyle}
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={promoteOpen}
        onClose={() => {
          setPromoteOpen(false);
          setPromoteDriverId(null);
        }}
        title={promoteModalTitle}
        description={promoteModalDescription}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setPromoteOpen(false);
                setPromoteDriverId(null);
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" form="eveider-team-promote-form" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Promouvoir'}
            </Button>
          </>
        }
      >
        <form id="eveider-team-promote-form" onSubmit={handlePromoteByEmail} style={{ display: 'grid', gap: '0.75rem' }}>
          {promoteDriverId ? null : (
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
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(revokeId)}
        onClose={() => setRevokeId(null)}
        onConfirm={() => void confirmRevoke()}
        title="Révoquer l’accès ?"
        description="La personne sera retirée de l’équipe opérationnelle Eveider."
        confirmLabel="Révoquer"
        tone="danger"
        loading={revoking}
      />
    </div>
  );
}
