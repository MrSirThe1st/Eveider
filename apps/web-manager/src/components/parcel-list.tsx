'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import { DataTable, IconPackage, IconSearch, type DataTableColumn, Button } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BusinessParcelFilters } from '@/components/business-parcel-filters';
import { FulfillmentMethodTag, OpsToolbar } from '@/components/ops-ui';
import { ListSearchField } from '@/components/list-search-field';
import { ParcelExportMenu } from '@/components/parcel-export-menu';
import { ParcelImportWizard } from '@/components/parcel-import-wizard';
import { ParcelStatusBadge } from '@/components/parcel-status-badge';
import { WEB_ROUTES, businessParcelPath } from '@/lib/auth-routing';
import {
  matchesBusinessAttention,
  type BusinessParcelAttentionFilter,
} from '@/lib/business-presentation';
import { matchesListSearch } from '@/lib/list-search';
import type { BusinessParcelListItem } from '@/server/parcels';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

const ATTENTION_VALUES = new Set([
  'all',
  'awaiting_handoff',
  'awaiting_deposit',
  'in_transit',
  'at_locker',
  'ready_for_pickup',
  'collected',
  'returns',
]);

type ParcelListProps = {
  parcels: BusinessParcelListItem[];
  initialAttention?: string;
  canCreate?: boolean;
};

export function ParcelList({ parcels, initialAttention, canCreate = false }: ParcelListProps) {
  const [attention, setAttention] = useState<BusinessParcelAttentionFilter>(
    ATTENTION_VALUES.has(initialAttention ?? '')
      ? (initialAttention as BusinessParcelAttentionFilter)
      : 'all',
  );
  const [pickupType, setPickupType] = useState<'all' | 'courier_pickup' | 'merchant_dropoff'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const filteredParcels = useMemo(() => {
    return parcels.filter((parcel) => {
      if (pickupType !== 'all' && parcel.pickupType !== pickupType) return false;
      if (
        !matchesBusinessAttention(
          {
            status: parcel.status,
            pickupType: parcel.pickupType,
            customerReturnStatus: parcel.customerReturnStatus,
          },
          attention,
        )
      ) {
        return false;
      }
      return matchesListSearch(
        searchQuery,
        parcel.trackingNumber,
        parcel.reference,
        parcel.recipientName,
        parcel.recipientPhone,
      );
    });
  }, [parcels, searchQuery, attention, pickupType]);

  const isBlankWorkspace = parcels.length === 0;
  const hasActiveQuery = Boolean(searchQuery.trim()) || attention !== 'all' || pickupType !== 'all';

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
        id: 'method',
        header: 'Méthode',
        sortable: true,
        sortValue: (row) => row.pickupTypeLabel,
        hideOnMobile: true,
        cell: (row) => <FulfillmentMethodTag pickupType={row.pickupType} />,
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
        sortValue: (row) => row.statusLabel,
        cell: (row) => (
          <div>
            <ParcelStatusBadge status={row.status} label={row.statusLabel} />
            {row.attentionLabel ? (
              <p
                style={{
                  margin: '0.35rem 0 0',
                  fontSize: typography.caption.fontSize,
                  color: colors.textMuted,
                  fontWeight: 600,
                }}
              >
                {row.attentionLabel}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Date',
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

  const emptyAction = (
    <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', justifyContent: 'center' }}>
      {canCreate ? (
        <Link href={WEB_ROUTES.businessNewParcel} className="nb-btn nb-btn-primary nb-btn--sm">
          Nouveau colis
        </Link>
      ) : null}
      {isBlankWorkspace && canCreate ? (
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
          Importer depuis Excel
        </Button>
      ) : null}
    </div>
  );

  return (
    <section>
      <OpsToolbar>
        <div className="ops-toolbar__search">
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par suivi, référence ou destinataire…"
            ariaLabel="Rechercher un colis"
          />
        </div>
        <div className="ops-toolbar__filters">
          <BusinessParcelFilters
            attention={attention}
            pickupType={pickupType}
            onAttentionChange={setAttention}
            onPickupTypeChange={setPickupType}
          />
        </div>
        <div className="ops-toolbar__actions">
          {canCreate ? (
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              Importer
            </Button>
          ) : null}
          <ParcelExportMenu
            compact
            exportPath="/api/organisation/parcels/export"
            filters={{
              search: searchQuery.trim() || undefined,
              attention: attention === 'all' ? undefined : attention,
              pickupType: pickupType === 'all' ? undefined : pickupType,
            }}
          />
        </div>
      </OpsToolbar>

      <DataTable
        columns={columns}
        rows={filteredParcels}
        getRowId={(row) => row.id}
        caption={filteredParcels.length > 0 ? `${filteredParcels.length} colis` : undefined}
        emptyTitle={
          searchQuery.trim()
            ? 'Aucun colis pour cette recherche'
            : hasActiveQuery
              ? 'Aucun colis pour ce filtre'
              : 'Pas encore de colis'
        }
        emptyDescription={
          searchQuery.trim()
            ? 'Essayez un autre numéro de suivi, une référence ou un destinataire.'
            : hasActiveQuery
              ? 'Modifiez les filtres État ou Méthode, ou réinitialisez-les.'
              : 'Créez un colis pour le réseau Eveider, ou importez-en plusieurs depuis Excel.'
        }
        emptyIcon={hasActiveQuery ? <IconSearch /> : <IconPackage />}
        emptyAction={canCreate || isBlankWorkspace ? emptyAction : undefined}
        initialSortId="createdAt"
        initialSortDirection="desc"
        rowPrimaryAction={(row) => ({
          label: 'Ouvrir',
          href: businessParcelPath(row.id),
        })}
      />

      <ParcelImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
    </section>
  );
}
