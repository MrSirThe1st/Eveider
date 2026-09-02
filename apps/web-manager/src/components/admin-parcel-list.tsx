'use client';

import { colors, spacing, typography, borderSubtle } from '@eveider/config-ui';
import {
  Button,
  DataTable,
  type DataTableColumn,
  Drawer,
  ErrorState,
  LoadingSpinner,
  TableSkeleton,
  useToast,
} from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardParcelItem } from '@/components/admin-dashboard-types';
import { ListSearchField } from '@/components/list-search-field';
import { ParcelExportMenu } from '@/components/parcel-export-menu';
import {
  ParcelStatusFilters,
  type ParcelStatusFilter,
} from '@/components/parcel-status-filters';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import { useAdminParcelsQuery } from '@/hooks/queries/use-parcels-query';
import { matchesListSearch } from '@/lib/list-search';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type AdminParcelListProps = {
  /** Parcels already loaded by the dashboard — avoids a duplicate /api/parcels call. */
  seedParcels?: DashboardParcelItem[];
};

export function AdminParcelList({ seedParcels }: AdminParcelListProps) {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<ParcelStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [previewParcel, setPreviewParcel] = useState<DashboardParcelItem | null>(null);
  const useSeed = statusFilter === 'all' && seedParcels !== undefined && !debouncedSearch;
  const refreshToastShown = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: fetchedParcels = [], isLoading, isFetching, isError, error, refetch } =
    useAdminParcelsQuery(statusFilter, {
      enabled: !useSeed || Boolean(debouncedSearch),
      initialData: useSeed ? seedParcels : undefined,
      search: debouncedSearch,
    });

  const parcels = useSeed ? seedParcels ?? [] : fetchedParcels;

  const filteredParcels = useMemo(
    () =>
      parcels.filter((parcel) =>
        matchesListSearch(
          searchQuery,
          parcel.reference,
          parcel.trackingNumber,
        ),
      ),
    [parcels, searchQuery],
  );

  const showInitialLoader = isLoading && parcels.length === 0 && !isFetching;
  const showFilterLoader = isFetching || (isLoading && parcels.length > 0);
  const showFatalError = isError && parcels.length === 0 && !showFilterLoader;
  const showRefreshError = isError && parcels.length > 0 && !showFilterLoader;
  const errorMessage =
    error instanceof Error ? error.message : 'Impossible de charger les colis.';

  useEffect(() => {
    if (showRefreshError && !refreshToastShown.current) {
      toast.error(
        `${errorMessage} Les données affichées peuvent être obsolètes.`,
        'Actualisation impossible',
      );
      refreshToastShown.current = true;
    }
    if (!isError) {
      refreshToastShown.current = false;
    }
  }, [errorMessage, isError, showRefreshError, toast]);

  const columns = useMemo<DataTableColumn<DashboardParcelItem>[]>(
    () => [
      {
        id: 'tracking',
        header: 'Suivi',
        sortable: true,
        sortValue: (row) => row.trackingNumber,
        cell: (row) => (
          <div>
            <button
              type="button"
              className="nb-data-table__link"
              onClick={() => setPreviewParcel(row)}
            >
              {row.trackingNumber}
            </button>
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
        id: 'business',
        header: 'Entreprise',
        sortable: true,
        sortValue: (row) => row.business.name,
        cell: (row) => row.business.name,
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

  const previewRows = previewParcel
    ? [
        { label: 'Entreprise', value: previewParcel.business.name },
        {
          label: 'Destinataire',
          value: previewParcel.recipientName ?? '—',
        },
        { label: 'Téléphone', value: previewParcel.recipientPhone },
        {
          label: 'Point',
          value: previewParcel.locker?.name ?? 'Non assigné',
        },
        {
          label: 'Adresse',
          value: previewParcel.locker?.address ?? '—',
        },
        { label: 'Créé le', value: formatDate(previewParcel.createdAt) },
      ]
    : [];

  return (
    <section>
      <ParcelStatusFilters value={statusFilter} onChange={setStatusFilter} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing[3],
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing[4],
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 200 }}>
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par référence ou numéro de suivi…"
            ariaLabel="Rechercher un colis par référence ou numéro de suivi"
          />
        </div>
        <ParcelExportMenu
          compact
          exportPath="/api/parcels/export"
          filters={{
            status: statusFilter === 'all' ? undefined : statusFilter,
            search: searchQuery.trim() || undefined,
          }}
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
          rows={filteredParcels}
          getRowId={(row) => row.id}
          caption={
            filteredParcels.length > 0
              ? searchQuery.trim()
                ? `${filteredParcels.length} colis sur ${parcels.length}`
                : `${filteredParcels.length} colis`
              : undefined
          }
          emptyTitle={
            searchQuery.trim()
              ? 'Aucun colis pour cette recherche'
              : statusFilter === 'all'
                ? 'Aucun colis'
                : 'Aucun colis pour ce filtre'
          }
          emptyDescription={
            searchQuery.trim()
              ? 'Essayez une autre référence ou un autre numéro de suivi.'
              : "Les nouveaux envois apparaîtront ici dès qu'ils seront créés."
          }
          initialSortId="createdAt"
          initialSortDirection="desc"
          rowActions={(row) => [
            {
              id: 'preview',
              label: 'Aperçu',
              onClick: () => setPreviewParcel(row),
            },
            {
              id: 'view',
              label: 'Voir le détail',
              href: `/tableau-de-bord/colis/${row.id}`,
            },
          ]}
        />
      ) : null}

      <Drawer
        open={previewParcel != null}
        onClose={() => setPreviewParcel(null)}
        title={previewParcel?.trackingNumber ?? 'Colis'}
        description="Aperçu rapide — ouvrez le détail pour les actions."
        footer={
          previewParcel ? (
            <>
              <Button variant="secondary" onClick={() => setPreviewParcel(null)}>
                Fermer
              </Button>
              <Link
                href={`/tableau-de-bord/colis/${previewParcel.id}`}
                className="nb-btn nb-btn-primary nb-btn--sm"
                style={{ textDecoration: 'none' }}
              >
                Ouvrir le détail
              </Link>
            </>
          ) : null
        }
      >
        {previewParcel ? (
          <div>
            <div style={{ marginBottom: spacing[5] }}>
              <ParcelStatusBadge status={previewParcel.status} />
            </div>
            <dl style={{ margin: 0, display: 'grid', gap: spacing[3] }}>
              {previewRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr',
                    gap: spacing[3],
                    paddingBottom: spacing[3],
                    borderBottom: borderSubtle(),
                  }}
                >
                  <dt
                    style={{
                      margin: 0,
                      fontSize: typography.caption.fontSize,
                      fontWeight: typography.weights.semibold,
                      color: colors.textMuted,
                    }}
                  >
                    {row.label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: typography.bodySm.fontSize,
                      fontWeight: typography.weights.semibold,
                      color: colors.secondary,
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}
