'use client';

import { colors, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { ConfirmDialog, EmptyState, IconSearch, IconUser, LoadingSpinner, PageFrame, TableSkeleton, useToast } from '@eveider/ui';
import { useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
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

  const { data: users = [], setUsers, isLoading, isFetching, isError, error, refetch } =
    useUsersQuery({
      search: debouncedSearch,
    });

  const showInitialLoader = isLoading && users.length === 0;
  const showRefreshError = isError && users.length > 0;
  const errorMessage =
    error instanceof Error ? error.message : 'Impossible de charger les utilisateurs.';

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

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <input
          type="text"
          placeholder="RECHERCHER PAR NOM, EMAIL OR NUMÉRO..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            ...webInputStyle,
            flex: '0 1 320px',
            height: 44,
            fontSize: '0.875rem',
          }}
        />
      </div>

      <div className="nb-data-table">
        {isFetching && users.length > 0 ? (
          <div style={{ padding: '1rem 2rem 0' }}>
            <LoadingSpinner compact size="sm" label="Mise à jour…" />
          </div>
        ) : null}

        {showInitialLoader ? (
          <div style={{ padding: '1rem' }}>
            <TableSkeleton />
          </div>
        ) : isError && users.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontWeight: 500, marginBottom: '1rem' }}>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              style={{ ...webSecondaryButtonStyle, padding: '0.5rem 1rem' }}
            >
              Réessayer
            </button>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            compact
            title="Aucun client trouvé"
            description="Essayez une autre recherche."
            icon={debouncedSearch.trim() ? <IconSearch /> : <IconUser />}
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Inscrit le</th>
                <th>Statut</th>
                <th className="nb-data-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="nb-data-table__row"
                  style={{
                    backgroundColor: user.isBlocked ? 'rgba(229, 57, 53, 0.02)' : undefined,
                  }}
                >
                  <td>{user.fullName?.toUpperCase() ?? '—'}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {user.email ?? '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {user.phone ?? '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: user.isBlocked
                          ? 'rgba(229, 57, 53, 0.1)'
                          : 'rgba(9, 212, 11, 0.1)',
                        color: user.isBlocked ? colors.danger : colors.success,
                      }}
                    >
                      {user.isBlocked ? 'BLOQUÉ' : 'ACTIF'}
                    </span>
                  </td>
                  <td className="nb-data-table__actions">
                    <button
                      type="button"
                      disabled={actingId === user.id}
                      onClick={() => setPendingUser(user)}
                      style={{
                        height: '28px',
                        padding: '0 10px',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        letterSpacing: '0.04em',
                        cursor: actingId === user.id ? 'wait' : 'pointer',
                        backgroundColor: user.isBlocked ? colors.primary : colors.danger,
                        color: colors.secondary,
                        opacity: actingId === user.id ? 0.6 : 1,
                      }}
                    >
                      {user.isBlocked ? 'ACTIVER' : 'BLOQUER'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
