'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListSearchField } from '@/components/list-search-field';
import { fetchJson } from '@/lib/api/fetch-json';
import type { BusinessListItem } from '@/server/businesses';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type BusinessListProps = {
  businesses?: BusinessListItem[];
};

export function BusinessList({ businesses: seedBusinesses = [] }: BusinessListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [businesses, setBusinesses] = useState<BusinessListItem[]>(seedBusinesses);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedSearch && seedBusinesses.length > 0) {
      setBusinesses(seedBusinesses);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
        const data = await fetchJson<{ businesses: BusinessListItem[] }>(`/api/businesses${params}`);
        if (!cancelled) setBusinesses(data.businesses);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, seedBusinesses]);

  const columns = useMemo<DataTableColumn<BusinessListItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Entreprise',
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/tableau-de-bord/entreprises/applications/${row.id}`}
            className="nb-data-table__link"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: 'accessCode',
        header: 'Code d’accès',
        sortable: true,
        sortValue: (row) => row.accessCode ?? '',
        hideOnMobile: true,
        cell: (row) => row.accessCode ?? '—',
      },
      {
        id: 'contact',
        header: 'Contact',
        sortable: true,
        sortValue: (row) => row.contactEmail ?? row.contactPhone ?? '',
        hideOnMobile: true,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: typography.weights.semibold }}>{row.contactEmail ?? '—'}</div>
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
          placeholder="Rechercher (nom, e-mail, code d’accès)…"
          ariaLabel="Rechercher une entreprise active"
        />
      </div>
      {loading ? (
        <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: colors.textMuted }}>
          Recherche…
        </p>
      ) : null}
      <DataTable
        columns={columns}
        rows={businesses}
        getRowId={(row) => row.id}
        caption={businesses.length > 0 ? `${businesses.length} entreprise(s) active(s)` : undefined}
        emptyTitle={
          debouncedSearch.trim() ? 'Aucune entreprise pour cette recherche' : 'Aucune entreprise active'
        }
        emptyDescription={
          debouncedSearch.trim()
            ? 'Essayez un autre nom, e-mail ou code d’accès.'
            : 'Les comptes partenaires vérifiés apparaîtront ici une fois activés.'
        }
        initialSortId="createdAt"
        initialSortDirection="desc"
        rowActions={(row) => [
          {
            id: 'view',
            label: 'Voir le dossier',
            href: `/tableau-de-bord/entreprises/applications/${row.id}`,
          },
        ]}
      />
    </div>
  );
}
