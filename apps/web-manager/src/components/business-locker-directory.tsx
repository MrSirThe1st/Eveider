'use client';

import { colors, spacing, typography, webCardStyle } from '@eveider/config-ui';
import { LOCKER_TYPE_LABELS } from '@eveider/domain';
import { DataTable, type DataTableColumn } from '@eveider/ui';
import { useMemo, useState } from 'react';
import { ListSearchField } from '@/components/list-search-field';
import { LockerGoogleMap } from '@/components/locker-google-map';
import { LockerStatusBadge } from '@/components/locker-status-badge';
import { businessNewParcelPath } from '@/lib/auth-routing';
import { matchesListSearch } from '@/lib/list-search';
import type { BusinessLockerDto, LockerMapMarkerDto } from '@/lib/locker-presenter';

type BusinessLockerDirectoryProps = {
  lockers: BusinessLockerDto[];
};

export function BusinessLockerDirectory({ lockers }: BusinessLockerDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLockerId, setSelectedLockerId] = useState<string>(lockers[0]?.id ?? '');

  const filteredLockers = useMemo(
    () =>
      lockers.filter((locker) =>
        matchesListSearch(
          searchQuery,
          locker.name,
          locker.networkLabel,
          locker.address,
          locker.typeLabel,
        ),
      ),
    [lockers, searchQuery],
  );

  const mapMarkers = useMemo(
    (): LockerMapMarkerDto[] =>
      filteredLockers.flatMap((locker) => {
        if (locker.latitude == null || locker.longitude == null) return [];
        return [
          {
            id: locker.id,
            name: locker.networkLabel,
            address: locker.address,
            latitude: locker.latitude,
            longitude: locker.longitude,
            type: locker.type,
            typeLabel: locker.typeLabel,
            status: locker.operatingStatus,
            statusLabel: locker.operatingStatusLabel,
            availableCompartments: locker.availableCompartments,
            availableSlots: locker.availableSlots,
            availableBySize: locker.availableBySize,
            rows: locker.rows,
            columns: locker.columns,
          },
        ];
      }),
    [filteredLockers],
  );

  const columns = useMemo<DataTableColumn<BusinessLockerDto>[]>(
    () => [
      {
        id: 'location',
        header: 'Lieu',
        sortable: true,
        sortValue: (row) => row.networkLabel,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 700 }}>{row.networkLabel}</div>
            <div style={{ color: colors.textMuted, fontSize: typography.caption.fontSize }}>
              {LOCKER_TYPE_LABELS[row.type]}
            </div>
          </div>
        ),
      },
      {
        id: 'address',
        header: 'Adresse',
        sortable: true,
        sortValue: (row) => row.address,
        hideOnMobile: true,
        cell: (row) => row.address,
      },
      {
        id: 'capacity',
        header: 'Capacité',
        sortable: true,
        sortValue: (row) => row.capacity,
        align: 'right',
        hideOnMobile: true,
        cell: (row) => row.capacity,
      },
      {
        id: 'available',
        header: 'Disponibles',
        sortable: true,
        sortValue: (row) => row.availableSlots,
        cell: (row) => (
          <div>
            <div>{row.availableSlots}</div>
            <div style={{ color: colors.textMuted, fontSize: typography.caption.fontSize }}>
              {row.availableLabel}
            </div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.operatingStatus,
        cell: (row) => <LockerStatusBadge status={row.operatingStatus} />,
      },
    ],
    [],
  );

  if (lockers.length === 0) {
    return (
      <section style={{ ...webCardStyle, padding: '2.5rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Aucun point Eveider pour le moment</p>
        <p
          style={{
            margin: '0.75rem 0 0',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: colors.textMuted,
          }}
        >
          Le réseau de casiers apparaîtra ici dès qu’Eveider ouvrira des points près de vous.
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: spacing[6] }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: spacing[5],
        }}
      >
        <LockerGoogleMap
          lockers={mapMarkers}
          selectedLockerId={selectedLockerId}
          onSelectLocker={setSelectedLockerId}
          height={360}
        />
      </div>

      <div>
        <div style={{ marginBottom: spacing[4] }}>
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un point (ex. Gombe, Kenya)…"
            ariaLabel="Rechercher un point Eveider"
          />
        </div>
        <DataTable
          columns={columns}
          rows={filteredLockers}
          getRowId={(row) => row.id}
          caption={
            searchQuery.trim()
              ? `${filteredLockers.length} point${filteredLockers.length > 1 ? 's' : ''} sur ${lockers.length}`
              : `${lockers.length} points`
          }
          emptyTitle="Aucun point pour cette recherche"
          emptyDescription="Essayez un autre quartier, nom ou adresse."
          initialSortId="location"
          rowActions={(row) => [
            {
              id: 'send',
              label: row.selectable ? 'Envoyer un colis ici' : 'Point indisponible',
              href: row.selectable ? businessNewParcelPath(row.id) : undefined,
              disabled: !row.selectable,
            },
          ]}
        />
      </div>
    </div>
  );
}
