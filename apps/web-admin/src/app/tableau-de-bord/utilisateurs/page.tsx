'use client';

import { colors, radius } from '@eveider/config-ui';
import { PageHeader } from '@eveider/ui';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';

type UserItem = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isBlocked: boolean;
  createdAt: string;
};

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
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadUsers = useCallback(async (currentRole: 'customer' | 'courier', query: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = query ? `&search=${encodeURIComponent(query)}` : '';
      const response = await fetch(`/api/users?role=${currentRole}${q}`, { cache: 'no-store' });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de charger les utilisateurs');
        setUsers([]);
      } else {
        setUsers(result.data.users);
      }
    } catch {
      setError('Erreur réseau lors du chargement');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      void loadUsers(role, search);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [role, search, loadUsers]);

  async function handleToggleStatus(user: UserItem) {
    setActingId(user.id);
    setError(null);
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
        setError(result.error ?? 'Mise à jour du statut échouée');
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isBlocked: nextState } : u))
        );
        setSuccess(
          `Compte de ${user.fullName ?? user.email ?? 'l\'utilisateur'} ${
            nextState ? 'bloqué' : 'activé'
          } avec succès`
        );
      }
    } catch {
      setError('Impossible de mettre à jour le compte');
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

      {success && <FlashBanner message={success} onDismiss={() => setSuccess(null)} />}
      {error && <FlashBanner message={error} variant="error" onDismiss={() => setError(null)} />}

      {/* Role Tabs & Search Row */}
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
        {/* Tabs */}
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

        {/* Search */}
        <input
          type="text"
          placeholder="RECHERCHER PAR NOM, EMAIL OR NUMÉRO..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '0 1 320px',
            height: 44,
            padding: '0 12px',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.button,
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            backgroundColor: colors.surface,
            outline: 'none',
          }}
        />
      </div>

      {/* Users Table */}
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.card,
          overflow: 'hidden',
        }}
      >
        {loading && users.length === 0 ? (
          <p style={{ padding: '2rem', fontWeight: 500, textAlign: 'center' }}>
            Chargement des utilisateurs…
          </p>
        ) : !loading && users.length === 0 ? (
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
              <tr style={{ borderBottom: `1px solid ${colors.border}`, background: colors.background }}>
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
                    borderBottom: `1px solid ${colors.border}`,
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
                      {role === 'courier' && (
                        <Link
                          href={`/tableau-de-bord/utilisateurs/${user.id}`}
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            color: colors.secondary,
                            textDecoration: 'none',
                            padding: '6px 12px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                          }}
                        >
                          PROFIL
                        </Link>
                      )}
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
