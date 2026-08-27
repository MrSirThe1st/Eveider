'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ListSearchField } from '@/components/list-search-field';
import type { BusinessListItem } from '@/server/businesses';
import { matchesListSearch } from '@/lib/list-search';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type BusinessListProps = {
  businesses: BusinessListItem[];
};

export function BusinessList({ businesses }: BusinessListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBusinesses = useMemo(
    () =>
      businesses.filter((business) =>
        matchesListSearch(
          searchQuery,
          business.name,
          business.contactEmail,
          business.contactPhone,
        ),
      ),
    [businesses, searchQuery],
  );

  const columns = useMemo<DataTableColumn<BusinessListItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Entreprise',
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/tableau-de-bord/organisations/applications/${row.id}`}
            className="nb-data-table__link"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        sortable: true,
        sortValue: (row) => row.contactEmail ?? row.contactPhone ?? '',
        hideOnMobile: true,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: typography.weights.semibold }}>
              {row.contactEmail ?? '—'}
            </div>
            {row.contactPhone ? (
              <div style={{ fontSize: typography.caption.fontSize, color: colors.textMuted }}>
                {row.contactPhone}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Inscrit le',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        align: 'right',
        cell: (row) => (
          <span style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
            {formatDate(row.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher une entreprise (nom, e-mail, téléphone)…"
          ariaLabel="Rechercher une entreprise active"
        />
      </div>
      <DataTable
        columns={columns}
        rows={filteredBusinesses}
        getRowId={(row) => row.id}
        caption={
          filteredBusinesses.length > 0
            ? searchQuery.trim()
              ? `${filteredBusinesses.length} entreprise${filteredBusinesses.length > 1 ? 's' : ''} sur ${businesses.length}`
              : `${filteredBusinesses.length} entreprise${filteredBusinesses.length > 1 ? 's' : ''} active${filteredBusinesses.length > 1 ? 's' : ''}`
            : undefined
        }
        emptyTitle={
          searchQuery.trim() ? 'Aucune entreprise pour cette recherche' : 'Aucune entreprise active'
        }
        emptyDescription={
          searchQuery.trim()
            ? 'Essayez un autre nom ou contact.'
            : 'Les comptes partenaires vérifiés apparaîtront ici une fois activés.'
        }
        initialSortId="createdAt"
        initialSortDirection="desc"
        rowActions={(row) => [
          {
            id: 'view',
            label: 'Voir le dossier',
            href: `/tableau-de-bord/organisations/applications/${row.id}`,
          },
        ]}
      />
    </div>
  );
}
