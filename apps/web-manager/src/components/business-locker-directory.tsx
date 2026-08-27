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

const TABLE_PAGE_SIZE = 8;

type MapFocus = {
  latitude: number;
  longitude: number;
  zoom?: number;
  key: number;
};

type BusinessLockerDirectoryProps = {
  lockers: BusinessLockerDto[];
};

export function BusinessLockerDirectory({ lockers }: BusinessLockerDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLockerId, setSelectedLockerId] = useState<string>(lockers[0]?.id ?? '');
  const [hoveredLockerId, setHoveredLockerId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);

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

  function focusLockerOnMap(lockerId: string) {
    const locker = lockers.find((item) => item.id === lockerId);
    if (locker?.latitude == null || locker.longitude == null) return;
    setMapFocus({
      latitude: locker.latitude,
      longitude: locker.longitude,
      zoom: 14,
      key: Date.now(),
    });
  }

  function selectLocker(lockerId: string, source: 'map' | 'table') {
    setSelectedLockerId(lockerId);
    if (source === 'table') focusLockerOnMap(lockerId);
  }

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
      <LockerGoogleMap
        lockers={mapMarkers}
        selectedLockerId={selectedLockerId}
        hoveredLockerId={hoveredLockerId ?? undefined}
        onSelectLocker={(lockerId) => selectLocker(lockerId, 'map')}
        onHoverLocker={setHoveredLockerId}
        mapFocus={mapFocus}
        height={360}
      />

      <DataTable
        columns={columns}
        rows={filteredLockers}
        getRowId={(row) => row.id}
        toolbar={
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un point (ex. Gombe, Kenya)…"
            ariaLabel="Rechercher un point Eveider"
          />
        }
        caption={
          searchQuery.trim()
            ? `${filteredLockers.length} point${filteredLockers.length > 1 ? 's' : ''} sur ${lockers.length}`
            : `${lockers.length} points`
        }
        emptyTitle="Aucun point pour cette recherche"
        emptyDescription="Essayez un autre quartier, nom ou adresse."
        initialSortId="location"
        pageSize={TABLE_PAGE_SIZE}
        selectedRowId={selectedLockerId}
        hoveredRowId={hoveredLockerId}
        onRowSelect={(lockerId) => selectLocker(lockerId, 'table')}
        onRowHover={setHoveredLockerId}
        rowPrimaryAction={(row) =>
          row.selectable
            ? {
                label: 'Envoyer un colis',
                href: businessNewParcelPath(row.id),
                title: `Créer un colis vers ${row.networkLabel}`,
              }
            : {
                label: 'Indisponible',
                disabled: true,
                title: 'Ce point n’accepte pas de colis pour le moment',
              }
        }
      />
    </div>
  );
}
