'use client';

import { colors, spacing, typography, borderSubtle } from '@eveider/config-ui';
import {
  Button,
  DataTable,
  type DataTableColumn,
  Drawer,
  ErrorState,
  IconPackage,
  IconSearch,
  LoadingSpinner,
  TableSkeleton,
  useToast,
} from '@eveider/ui';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardParcelItem } from '@/components/admin-dashboard-types';
import { AdminParcelFilters } from '@/components/admin-parcel-filters';
import { ListSearchField } from '@/components/list-search-field';
import { ParcelExportMenu } from '@/components/parcel-export-menu';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import { useAdminParcelsQuery } from '@/hooks/queries/use-parcels-query';
import type { AdminParcelAttentionFilter } from '@/lib/admin-presentation';
import { getAdminParcelDisplayStatus, getFulfillmentMethodLabel } from '@/lib/admin-presentation';
import { matchesListSearch } from '@/lib/list-search';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function parseAttention(raw: string | null): AdminParcelAttentionFilter {
  if (
    raw === 'awaiting_assignment' ||
    raw === 'in_transit' ||
    raw === 'at_locker' ||
    raw === 'ready_for_pickup' ||
    raw === 'return_at_locker' ||
    raw === 'returned'
  ) {
    return raw;
  }
  return 'all';
}

function parsePickupType(raw: string | null): 'all' | 'courier_pickup' | 'merchant_dropoff' {
  if (raw === 'courier_pickup' || raw === 'merchant_dropoff') return raw;
  return 'all';
}

function emptyCopy(attention: AdminParcelAttentionFilter, searching: boolean) {
  if (searching) {
    return {
      title: 'Aucun colis pour cette recherche',
      description: 'Essayez une autre référence ou un autre numéro de suivi.',
    };
  }
  switch (attention) {
    case 'awaiting_assignment':
      return {
        title: 'Aucun colis à assigner',
        description: 'Les Collectes Eveider sans chauffeur apparaîtront ici.',
      };
    case 'in_transit':
      return {
        title: 'Aucun colis en transport',
        description: 'Les colis actuellement transportés par Eveider apparaîtront ici.',
      };
    case 'at_locker':
      return {
        title: 'Aucun colis actuellement au casier',
        description: 'Les colis déposés et pas encore prêts au retrait apparaîtront ici.',
      };
    case 'ready_for_pickup':
      return {
        title: 'Aucun colis prêt au retrait',
        description: 'Les colis en attente du destinataire apparaîtront ici.',
      };
    case 'return_at_locker':
      return {
        title: 'Aucun retour au casier',
        description: 'Les retours client déposés au casier apparaîtront ici.',
      };
    case 'returned':
      return {
        title: 'Aucun colis retourné',
        description: 'Les retours terminés apparaîtront ici.',
      };
    default:
      return {
        title: 'Aucun colis',
        description: 'Les nouveaux envois apparaîtront ici dès qu’ils seront créés.',
      };
  }
}

type AdminParcelListProps = {
  seedParcels?: DashboardParcelItem[];
};

export function AdminParcelList(_props: AdminParcelListProps = {}) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const attention = parseAttention(searchParams.get('attention'));
  const pickupType = parsePickupType(searchParams.get('pickupType'));
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [previewParcel, setPreviewParcel] = useState<DashboardParcelItem | null>(null);
  const refreshToastShown = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: parcels = [], isLoading, isFetching, isError, error, refetch } =
    useAdminParcelsQuery({
      attention,
      pickupType,
      search: debouncedSearch,
    });

  const filteredParcels = useMemo(
    () =>
      parcels.filter((parcel) =>
        matchesListSearch(searchQuery, parcel.reference, parcel.trackingNumber, parcel.recipientName),
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

  function updateQuery(next: { attention?: AdminParcelAttentionFilter; pickupType?: typeof pickupType }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextAttention = next.attention ?? attention;
    const nextPickup = next.pickupType ?? pickupType;
    if (nextAttention === 'all') params.delete('attention');
    else params.set('attention', nextAttention);
    if (nextPickup === 'all') params.delete('pickupType');
    else params.set('pickupType', nextPickup);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

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
        id: 'method',
        header: 'Méthode',
        sortable: true,
        sortValue: (row) => row.pickupTypeLabel ?? getFulfillmentMethodLabel(row.pickupType),
        hideOnMobile: true,
        cell: (row) => row.pickupTypeLabel ?? getFulfillmentMethodLabel(row.pickupType),
      },
      {
        id: 'locker',
        header: 'Casier',
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
        header: 'État',
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => {
          const statusLabel =
            row.statusLabel ??
            getAdminParcelDisplayStatus({
              status: row.status,
              pickupType: row.pickupType,
            });
          const needsAttention =
            statusLabel === 'En attente de prise en charge' || row.status === 'return_at_point';
          return (
            <div>
              <ParcelStatusBadge status={row.status} label={statusLabel} />
              {needsAttention ? (
                <p
                  style={{
                    margin: `${spacing[1]}px 0 0`,
                    fontSize: typography.caption.fontSize,
                    color: colors.textMuted,
                  }}
                >
                  Attention
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Créé',
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
        { label: 'Destinataire', value: previewParcel.recipientName ?? '—' },
        { label: 'Téléphone', value: previewParcel.recipientPhone },
        {
          label: 'Méthode',
          value:
            previewParcel.pickupTypeLabel ?? getFulfillmentMethodLabel(previewParcel.pickupType),
        },
        {
          label: 'Casier',
          value: previewParcel.locker?.name ?? 'Non assigné',
        },
        {
          label: 'Adresse',
          value: previewParcel.locker?.address ?? '—',
        },
        { label: 'Créé', value: formatDate(previewParcel.createdAt) },
      ]
    : [];

  const empty = emptyCopy(attention, Boolean(searchQuery.trim()));

  return (
    <section>
      <AdminParcelFilters
        attention={attention}
        pickupType={pickupType}
        onAttentionChange={(value) => updateQuery({ attention: value })}
        onPickupTypeChange={(value) => updateQuery({ pickupType: value })}
      />

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
            placeholder="Rechercher par suivi, référence ou destinataire…"
            ariaLabel="Rechercher un colis par numéro de suivi, référence ou destinataire"
          />
        </div>
        <ParcelExportMenu
          compact
          exportPath="/api/parcels/export"
          filters={{
            attention: attention === 'all' ? undefined : attention,
            pickupType: pickupType === 'all' ? undefined : pickupType,
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
          emptyTitle={empty.title}
          emptyDescription={empty.description}
          emptyIcon={
            searchQuery.trim() || attention !== 'all' ? <IconSearch /> : <IconPackage />
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
              <ParcelStatusBadge
                status={previewParcel.status}
                label={
                  previewParcel.statusLabel ??
                  getAdminParcelDisplayStatus({
                    status: previewParcel.status,
                    pickupType: previewParcel.pickupType,
                  })
                }
              />
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
