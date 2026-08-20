'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import {
  Button,
  DataTable,
  type DataTableColumn,
  ErrorState,
  LoadingSpinner,
  TableSkeleton,
} from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListSearchField } from '@/components/list-search-field';
import {
  ParcelStatusFilters,
  type ParcelStatusFilter,
} from '@/components/parcel-status-filters';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import { useBusinessParcelsQuery, type BusinessParcelItem } from '@/hooks/queries/use-parcels-query';
import { WEB_ROUTES, businessParcelPath } from '@/lib/auth-routing';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function ParcelList() {
  const [statusFilter, setStatusFilter] = useState<ParcelStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: parcels = [], isLoading, isFetching, isError, error, refetch } =
    useBusinessParcelsQuery(statusFilter, debouncedSearch);

  const showInitialLoader = isLoading && parcels.length === 0 && !isFetching;
  const showFilterLoader = isFetching || (isLoading && parcels.length > 0);
  const showFatalError = isError && parcels.length === 0 && !showFilterLoader;
  const errorMessage =
    error instanceof Error ? error.message : 'Impossible de charger les colis. Vérifiez la connexion au serveur.';

  const columns = useMemo<DataTableColumn<BusinessParcelItem>[]>(
    () => [
      {
        id: 'tracking',
        header: 'Suivi',
        sortable: true,
        sortValue: (row) => row.trackingNumber,
        cell: (row) => (
          <div>
            <Link href={businessParcelPath(row.id)} className="nb-data-table__link">
              {row.trackingNumber}
            </Link>
            {row.reference ? (
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.caption.fontSize,
                  color: colors.textMuted,
                }}
              >
                Réf. {row.reference}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'recipient',
        header: 'Destinataire',
        sortable: true,
        sortValue: (row) => row.recipientName ?? row.recipientPhone,
        hideOnMobile: true,
        cell: (row) => (
          <div>
            <div>{row.recipientName ?? 'Destinataire'}</div>
            <div style={{ color: colors.textMuted, fontSize: typography.caption.fontSize }}>
              {row.recipientPhone}
            </div>
          </div>
        ),
      },
      {
        id: 'locker',
        header: 'Point',
        sortable: true,
        sortValue: (row) => row.locker?.name ?? '',
        hideOnMobile: true,
        cell: (row) =>
          row.locker ? (
            row.locker.name
          ) : (
            <span style={{ color: colors.textMuted }}>Non assigné</span>
          ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <ParcelStatusBadge status={row.status} />,
      },
      {
        id: 'createdAt',
        header: 'Créé le',
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
    <section>
      <ParcelStatusFilters value={statusFilter} onChange={setStatusFilter} />

      <div style={{ marginBottom: spacing[4] }}>
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher par suivi, référence ou destinataire…"
          ariaLabel="Rechercher un colis"
        />
      </div>

      {showFilterLoader ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: `${spacing[10]}px 0`,
          }}
        >
          <LoadingSpinner compact size="md" label="Chargement des colis…" />
        </div>
      ) : null}

      {showInitialLoader ? <TableSkeleton /> : null}

      {showFatalError ? (
        <ErrorState
          title="Impossible de charger les colis"
          message={errorMessage}
          action={
            <Button variant="secondary" onClick={() => void refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : null}

      {!showInitialLoader && !showFatalError && !showFilterLoader ? (
        <DataTable
          columns={columns}
          rows={parcels}
          getRowId={(row) => row.id}
          caption={parcels.length > 0 ? `${parcels.length} colis` : undefined}
          emptyTitle={
            searchQuery.trim()
              ? 'Aucun colis pour cette recherche'
              : statusFilter === 'all'
                ? 'Aucun colis'
                : 'Aucun colis pour ce filtre'
          }
          emptyDescription={
            searchQuery.trim()
              ? 'Essayez un autre numéro de suivi, une référence ou un destinataire.'
              : 'Créez votre premier colis pour le réseau Eveider.'
          }
          emptyAction={
            <Link href={WEB_ROUTES.businessNewParcel} className="nb-btn nb-btn-primary nb-btn--sm">
              Nouveau colis
            </Link>
          }
          initialSortId="createdAt"
          initialSortDirection="desc"
          rowActions={(row) => [
            {
              id: 'view',
              label: 'Voir le détail',
              href: businessParcelPath(row.id),
            },
          ]}
        />
      ) : null}
    </section>
  );
}
