'use client';

import { webSecondaryButtonStyle } from '@eveider/config-ui';
import { ConfirmDialog, DataTable, DEFAULT_TABLE_PAGE_SIZE, IconSearch, IconUser, PageFrame, StatusBadge, TableCellStack, type DataTableColumn, useToast } from '@eveider/ui';
import { useEffect, useMemo, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { ListSearchField } from '@/components/list-search-field';
import { type UserListItem, useUsersQuery } from '@/hooks/queries/use-users-query';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export default function UsersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<UserListItem | null>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const { data: users = [], setUsers, isLoading, isError, error, refetch } =
    useUsersQuery({
      search: debouncedSearch,
    });

  const showInitialLoader = isLoading && users.length === 0;
  const showRefreshError = isError && users.length > 0;
  const errorMessage =
    error instanceof Error ? error.message : 'Impossible de charger les utilisateurs.';

  const columns = useMemo<DataTableColumn<UserListItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Nom',
        sortable: true,
        sortValue: (row) => row.fullName ?? '',
        cell: (row) => (
          <TableCellStack primary={row.fullName ?? '—'} secondary={row.email ?? undefined} />
        ),
      },
      {
        id: 'phone',
        header: 'Téléphone',
        hideOnMobile: true,
        cell: (row) => row.phone ?? '—',
      },
      {
        id: 'createdAt',
        header: 'Inscrit le',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        numeric: true,
        cell: (row) => (
          <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => (row.isBlocked ? 'blocked' : 'active'),
        cell: (row) => (
          <StatusBadge tone={row.isBlocked ? 'danger' : 'success'}>
            {row.isBlocked ? 'Bloqué' : 'Actif'}
          </StatusBadge>
        ),
      },
    ],
    [],
  );

  async function handleToggleStatus(user: UserListItem) {
    setActingId(user.id);
    setActionError(null);
    setSuccess(null);

    const nextState = !user.isBlocked;

    try {
      const response = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: nextState }),
      });
      const result = await response.json();

      if (!result.success) {
        const message = result.error ?? 'Mise à jour du statut échouée';
        setActionError(message);
        toast.error(message);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isBlocked: nextState } : u)),
        );
        const message = `Compte de ${user.fullName ?? user.email ?? "l'utilisateur"} ${
          nextState ? 'bloqué' : 'activé'
        } avec succès`;
        setSuccess(message);
        toast.success(message);
      }
    } catch {
      setActionError('Impossible de mettre à jour le compte');
      toast.error('Impossible de mettre à jour le compte');
    } finally {
      setActingId(null);
      setPendingUser(null);
    }
  }

  return (
    <PageFrame
      title="Utilisateurs"
      description="Comptes des clients Eveider."
      layout="wide"
    >
      {success ? <FlashBanner message={success} onDismiss={() => setSuccess(null)} /> : null}
      {actionError ? (
        <FlashBanner message={actionError} variant="error" onDismiss={() => setActionError(null)} />
      ) : null}
      {showRefreshError ? (
        <FlashBanner
          message={`${errorMessage} Les données affichées peuvent être obsolètes.`}
          variant="error"
        />
      ) : null}

      <DataTable
        columns={columns}
        rows={users}
        getRowId={(row) => row.id}
        search={
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par nom, email ou numéro…"
            ariaLabel="Rechercher par nom, email ou numéro"
          />
        }
        loading={showInitialLoader}
        error={
          isError && users.length === 0
            ? {
                title: 'Impossible de charger les utilisateurs',
                message: errorMessage,
                action: (
                  <button type="button" onClick={() => void refetch()} style={webSecondaryButtonStyle}>
                    Réessayer
                  </button>
                ),
              }
            : null
        }
        emptyTitle="Aucun résultat"
        emptyDescription="Aucun client ne correspond à la recherche actuelle."
        emptyIcon={debouncedSearch.trim() ? <IconSearch /> : <IconUser />}
        sortBy="createdAt"
        pageSize={DEFAULT_TABLE_PAGE_SIZE}
        rowActions={(user) => [
          {
            id: 'toggle',
            label: user.isBlocked ? 'Activer' : 'Bloquer',
            tone: user.isBlocked ? 'default' : 'danger',
            disabled: actingId === user.id,
            onClick: () => setPendingUser(user),
          },
        ]}
      />

      <ConfirmDialog
        open={pendingUser != null}
        onClose={() => {
          if (!actingId) setPendingUser(null);
        }}
        onConfirm={() => {
          if (pendingUser) void handleToggleStatus(pendingUser);
        }}
        title={
          pendingUser?.isBlocked ? 'Activer ce compte ?' : 'Bloquer ce compte ?'
        }
        description={
          pendingUser
            ? pendingUser.isBlocked
              ? `${pendingUser.fullName ?? pendingUser.email ?? 'Cet utilisateur'} pourra à nouveau accéder à Eveider.`
              : `${pendingUser.fullName ?? pendingUser.email ?? 'Cet utilisateur'} ne pourra plus se connecter tant que le compte est bloqué.`
            : undefined
        }
        confirmLabel={pendingUser?.isBlocked ? 'Activer' : 'Bloquer'}
        tone={pendingUser?.isBlocked ? 'default' : 'danger'}
        loading={actingId != null}
      />
    </PageFrame>
  );
}
