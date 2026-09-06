'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, IconBuilding, IconSearch, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminAccountStatusBadge } from '@/components/admin-account-status-badge';
import { ListSearchField } from '@/components/list-search-field';
import { VerificationStatusBadge } from '@/components/verification-status-badge';
import { matchesListSearch } from '@/lib/list-search';
import type { AdminOrganizationListItem } from '@/server/organizations';
import type { AdminAccountStatus, OrganizationVerificationStatus } from '@eveider/domain';

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
  const [verificationFilter, setVerificationFilter] = useState<
    OrganizationVerificationStatus | 'all'
  >('all');

  const filtered = useMemo(
    () =>
      organizations.filter((org) => {
        if (accountFilter !== 'all' && org.accountStatus !== accountFilter) return false;
        if (verificationFilter !== 'all' && org.verificationStatus !== verificationFilter) {
          return false;
        }
        return matchesListSearch(
          searchQuery,
          org.name,
          org.ownerName,
          org.ownerEmail,
        );
      }),
    [organizations, searchQuery, accountFilter, verificationFilter],
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
        id: 'verificationStatus',
        header: 'Vérification',
        sortable: true,
        sortValue: (row) => row.verificationStatus,
        cell: (row) => <VerificationStatusBadge status={row.verificationStatus} />,
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
        <select
          value={verificationFilter}
          onChange={(e) =>
            setVerificationFilter(e.target.value as OrganizationVerificationStatus | 'all')
          }
          style={selectStyle}
          aria-label="Filtrer par vérification"
        >
          <option value="all">Vérification : tous</option>
          <option value="not_started">Non vérifié</option>
          <option value="pending">En attente</option>
          <option value="correction_requested">Correction requise</option>
          <option value="approved">Vérifié</option>
          <option value="rejected">Refusé</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        emptyTitle={
          searchQuery.trim() || accountFilter !== 'all' || verificationFilter !== 'all'
            ? 'Aucune organisation pour ces filtres'
            : 'Aucune organisation'
        }
        emptyDescription={
          searchQuery.trim() || accountFilter !== 'all' || verificationFilter !== 'all'
            ? 'Modifiez les filtres pour élargir la recherche.'
            : 'Les organisations Eveider apparaîtront ici.'
        }
        emptyIcon={
          searchQuery.trim() || accountFilter !== 'all' || verificationFilter !== 'all' ? (
            <IconSearch />
          ) : (
            <IconBuilding />
          )
        }
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
