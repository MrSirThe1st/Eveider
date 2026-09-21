'use client';

import { DataTable, DEFAULT_TABLE_PAGE_SIZE, FilterToolbar, IconBuilding, IconSearch, type DataTableColumn } from '@eveider/ui';
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
        return matchesListSearch(searchQuery, org.name, org.ownerName, org.ownerEmail);
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
          <Link href={`/tableau-de-bord/organisations/${row.id}`} className="nb-data-table__link">
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
        numeric: true,
        hideOnMobile: true,
        cell: (row) => (
          <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {formatDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const hasFilters = Boolean(searchQuery.trim()) || accountFilter !== 'all';

  return (
    <DataTable
      columns={columns}
      rows={filtered}
      getRowId={(row) => row.id}
      search={
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher une organisation par nom ou propriétaire…"
          ariaLabel="Rechercher une organisation"
        />
      }
      filters={
        <FilterToolbar
          embedded
          onClearAll={() => setAccountFilter('all')}
          filters={[
            {
              id: 'account',
              label: 'Compte',
              value: accountFilter,
              emptyValue: 'all',
              options: [
                { value: 'all', label: 'Tous' },
                { value: 'active', label: 'Actif' },
                { value: 'suspended', label: 'Suspendu' },
              ],
              onChange: (next) => setAccountFilter(next as AdminAccountStatus | 'all'),
            },
          ]}
        />
      }
      emptyTitle={hasFilters ? 'Aucun résultat' : 'Aucune organisation'}
      emptyDescription={
        hasFilters
          ? 'Aucune organisation ne correspond aux filtres actuels.'
          : 'Les organisations Eveider apparaîtront ici.'
      }
      emptyIcon={hasFilters ? <IconSearch /> : <IconBuilding />}
      emptyAction={
        hasFilters ? (
          <button
            type="button"
            className="nb-btn nb-btn-secondary nb-btn--sm"
            onClick={() => {
              setSearchQuery('');
              setAccountFilter('all');
            }}
          >
            Réinitialiser les filtres
          </button>
        ) : undefined
      }
      pageSize={DEFAULT_TABLE_PAGE_SIZE}
      sortBy="name"
      rowPrimaryAction={(row) => ({
        label: 'Détails',
        href: `/tableau-de-bord/organisations/${row.id}`,
      })}
    />
  );
}
