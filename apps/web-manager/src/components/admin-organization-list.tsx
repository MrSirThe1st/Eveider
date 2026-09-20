'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, IconBuilding, IconSearch, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminAccountStatusBadge } from '@/components/admin-account-status-badge';
import { ListSearchField } from '@/components/list-search-field';
import { matchesListSearch } from '@/lib/list-search';
import type { AdminOrganizationListItem } from '@/server/organizations';
import type { AdminAccountStatus } from '@eveider/domain';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type AdminOrganizationListProps = {
  organizations: AdminOrganizationListItem[];
};

export function AdminOrganizationList({ organizations }: AdminOrganizationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<AdminAccountStatus | 'all'>('all');

  const filtered = useMemo(
    () =>
      organizations.filter((org) => {
        if (accountFilter !== 'all' && org.accountStatus !== accountFilter) return false;
        return matchesListSearch(
          searchQuery,
          org.name,
          org.ownerName,
          org.ownerEmail,
        );
      }),
    [organizations, searchQuery, accountFilter],
  );

  const columns = useMemo<DataTableColumn<AdminOrganizationListItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Organisation',
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/tableau-de-bord/organisations/${row.id}`}
            className="nb-data-table__link"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: 'owner',
        header: 'Propriétaire',
        sortable: true,
        sortValue: (row) => row.ownerName ?? row.ownerEmail ?? '',
        hideOnMobile: true,
        cell: (row) => row.ownerName ?? row.ownerEmail ?? '—',
      },
      {
        id: 'accountStatus',
        header: 'Compte',
        sortable: true,
        sortValue: (row) => row.accountStatus,
        cell: (row) => <AdminAccountStatusBadge status={row.accountStatus} />,
      },
      {
        id: 'updatedAt',
        header: 'Mis à jour',
        sortable: true,
        sortValue: (row) => new Date(row.updatedAt).getTime(),
        align: 'right',
        hideOnMobile: true,
        cell: (row) => (
          <span style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
            {formatDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const selectStyle = {
    height: 40,
    padding: '0 0.75rem',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    fontSize: typography.caption.fontSize,
    background: colors.surface,
  };

  const hasFilters = searchQuery.trim() || accountFilter !== 'all';

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 220px', maxWidth: 420 }}>
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher une organisation…"
            ariaLabel="Rechercher une organisation"
          />
        </div>
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value as AdminAccountStatus | 'all')}
          style={selectStyle}
          aria-label="Filtrer par statut de compte"
        >
          <option value="all">Compte : tous</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        emptyTitle={hasFilters ? 'Aucune organisation pour ces filtres' : 'Aucune organisation'}
        emptyDescription={
          hasFilters
            ? 'Modifiez les filtres pour élargir la recherche.'
            : 'Les organisations Eveider apparaîtront ici.'
        }
        emptyIcon={hasFilters ? <IconSearch /> : <IconBuilding />}
        rowActions={(row) => [
          {
            id: 'view',
            label: 'Voir',
            href: `/tableau-de-bord/organisations/${row.id}`,
          },
        ]}
      />
    </div>
  );
}
