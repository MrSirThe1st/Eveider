'use client';

import { colors, radius, borderSubtle, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { LoadingSpinner, PageHeader } from '@eveider/ui';
import Link from 'next/link';
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
  const [role, setRole] = useState<'customer' | 'courier'>('customer');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const { data: users = [], setUsers, isLoading, isFetching, isError, error, refetch } =
    useUsersQuery({
      role,
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
        setActionError(result.error ?? 'Mise à jour du statut échouée');
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isBlocked: nextState } : u)),
        );
        setSuccess(
          `Compte de ${user.fullName ?? user.email ?? "l'utilisateur"} ${
            nextState ? 'bloqué' : 'activé'
          } avec succès`,
        );
      }
    } catch {
      setActionError('Impossible de mettre à jour le compte');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <PageHeader
        title="Gestion des utilisateurs"
        description="Consultez et gérez les comptes des clients et des coursiers."
      />

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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            background: colors.border,
            padding: '3px',
            borderRadius: radius.button,
            height: '44px',
          }}
        >
          <button
            type="button"
            onClick={() => setRole('customer')}
            style={{
              padding: '0 1.5rem',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              backgroundColor: role === 'customer' ? colors.surface : 'transparent',
              color: colors.secondary,
              transition: 'all 0.15s',
            }}
          >
            CLIENTS
          </button>
          <button
            type="button"
            onClick={() => setRole('courier')}
            style={{
              padding: '0 1.5rem',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              backgroundColor: role === 'courier' ? colors.surface : 'transparent',
              color: colors.secondary,
              transition: 'all 0.15s',
            }}
          >
            COURSIERS
          </button>
        </div>

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

      <div
        style={{
          ...webCardStyle,
          overflow: 'hidden',
        }}
      >
        {isFetching && users.length > 0 ? (
          <p style={{ padding: '1rem 2rem 0', fontSize: '0.75rem', fontWeight: 500, opacity: 0.7 }}>
            Mise à jour…
          </p>
        ) : null}

        {showInitialLoader ? (
          <LoadingSpinner label="Chargement des utilisateurs…" minHeight="16rem" />
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
          <p style={{ padding: '2rem', fontWeight: 500, textAlign: 'center', opacity: 0.65 }}>
            Aucun utilisateur trouvé.
          </p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: borderSubtle(), background: colors.background }}>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                  NOM
                </th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                  EMAIL
                </th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                  TÉLÉPHONE
                </th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                  INSCRIT LE
                </th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                  STATUT
                </th>
                <th style={{ padding: '1rem', fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em', textAlign: 'right' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: borderSubtle(),
                    backgroundColor: user.isBlocked ? 'rgba(229, 57, 53, 0.02)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '1rem', fontWeight: 600 }}>
                    {role === 'courier' ? (
                      <Link
                        href={`/tableau-de-bord/utilisateurs/${user.id}`}
                        style={{ color: colors.secondary, textDecoration: 'none', fontWeight: 700 }}
                      >
                        {user.fullName?.toUpperCase() ?? '—'}
                      </Link>
                    ) : (
                      user.fullName?.toUpperCase() ?? '—'
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#555555' }}>
                    {user.email ?? '—'}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#555555' }}>
                    {user.phone ?? '—'}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#555555' }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td style={{ padding: '1rem' }}>
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
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                      {role === 'courier' ? (
                        <Link
                          href={`/tableau-de-bord/utilisateurs/${user.id}`}
                          style={{
                            ...webSecondaryButtonStyle,
                            fontSize: '0.75rem',
                            padding: '6px 12px',
                            textDecoration: 'none',
                          }}
                        >
                          PROFIL
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={actingId === user.id}
                        onClick={() => void handleToggleStatus(user)}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
