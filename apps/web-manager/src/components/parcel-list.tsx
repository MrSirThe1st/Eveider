'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BusinessParcelLocationBadge } from '@/components/business-parcel-location-badge';
import {
  BusinessParcelLocationFilters,
  type BusinessParcelLocationFilter,
} from '@/components/business-parcel-location-filters';
import { ListSearchField } from '@/components/list-search-field';
import { ParcelExportMenu } from '@/components/parcel-export-menu';
import { ParcelImportWizard } from '@/components/parcel-import-wizard';
import { Button } from '@eveider/ui';
import { WEB_ROUTES, businessParcelPath } from '@/lib/auth-routing';
import { matchesListSearch } from '@/lib/list-search';
import type { BusinessParcelListItem } from '@/server/parcels';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

type ParcelListProps = {
  parcels: BusinessParcelListItem[];
};

export function ParcelList({ parcels }: ParcelListProps) {
  const [locationFilter, setLocationFilter] = useState<BusinessParcelLocationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const filteredParcels = useMemo(() => {
    return parcels.filter((parcel) => {
      if (locationFilter !== 'all' && parcel.location !== locationFilter) return false;
      return matchesListSearch(
        searchQuery,
        parcel.trackingNumber,
        parcel.reference,
        parcel.recipientName,
        parcel.recipientPhone,
      );
    });
  }, [parcels, searchQuery, locationFilter]);

  const columns = useMemo<DataTableColumn<BusinessParcelListItem>[]>(
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
        id: 'location',
        header: 'Situation',
        sortable: true,
        sortValue: (row) => row.location,
        cell: (row) => <BusinessParcelLocationBadge location={row.location} />,
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
      <BusinessParcelLocationFilters value={locationFilter} onChange={setLocationFilter} />

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
            ariaLabel="Rechercher un colis"
          />
        </div>
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            Importer Excel
          </Button>
          <ParcelExportMenu
            compact
            exportPath="/api/organisation/parcels/export"
            filters={{
              location: locationFilter === 'all' ? undefined : locationFilter,
              search: searchQuery.trim() || undefined,
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredParcels}
        getRowId={(row) => row.id}
        caption={filteredParcels.length > 0 ? `${filteredParcels.length} colis` : undefined}
        emptyTitle={
          searchQuery.trim()
            ? 'Aucun colis pour cette recherche'
            : locationFilter === 'all'
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

      <ParcelImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
    </section>
  );
}
