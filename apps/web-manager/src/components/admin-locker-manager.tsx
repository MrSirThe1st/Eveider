'use client';

import { colors, typography } from '@eveider/config-ui';
import { usesCompartmentGrid } from '@eveider/domain';
import { DataTable, DEFAULT_TABLE_PAGE_SIZE, FilterToolbar, IconMapPin, IconSearch, TableCellStack, TruncatedText, type DataTableColumn } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListSearchField } from '@/components/list-search-field';
import { LockerGoogleMap } from '@/components/locker-google-map';
import { LockerStatusBadge } from '@/components/locker-status-badge';
import type { CityOptionDto } from '@/lib/city-presenter';
import { formatLockerZoneLabel, zonesForCity } from '@/lib/geography-presentation';
import { matchesListSearch } from '@/lib/list-search';
import type { LockerMapMarkerDto, LockerSummaryDto } from '@/lib/locker-presenter';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';

type AdminLockerManagerProps = {
  lockers: LockerSummaryDto[];
  serviceAreas?: ServiceAreaOptionDto[];
  cities?: CityOptionDto[];
  initialCityId?: string;
  initialZoneId?: string;
};

type StatusFilter = 'all' | 'active' | 'offline' | 'full';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actif' },
  { value: 'offline', label: 'Hors ligne' },
  { value: 'full', label: 'Complet' },
];

export function AdminLockerManager({
  lockers,
  serviceAreas = [],
  cities = [],
  initialCityId = '',
  initialZoneId = '',
}: AdminLockerManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState(initialCityId);
  const [zoneFilter, setZoneFilter] = useState(initialZoneId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedLockerId, setSelectedLockerId] = useState('');
  const [hoveredLockerId, setHoveredLockerId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    key: number;
  } | null>(null);

  const networkLockers = useMemo(
    () => lockers.filter((locker) => locker.type === 'SMART_LOCKER'),
    [lockers],
  );

  const cityOptions = useMemo(() => {
    const fromCities = cities.map((city) => ({ value: city.id, label: city.name }));
    if (fromCities.length > 0) {
      return [{ value: 'all', label: 'Toutes' }, ...fromCities];
    }
    const map = new Map<string, string>();
    for (const locker of networkLockers) {
      if (locker.serviceAreaCityId && locker.serviceAreaCity) {
        map.set(locker.serviceAreaCityId, locker.serviceAreaCity);
      }
    }
    return [
      { value: 'all', label: 'Toutes' },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [cities, networkLockers]);

  const zoneOptions = useMemo(() => {
    const scoped = cityFilter && cityFilter !== 'all' ? zonesForCity(serviceAreas, cityFilter) : serviceAreas;
    return [
      { value: 'all', label: 'Toutes' },
      ...scoped.map((area) => ({ value: area.id, label: area.label })),
    ];
  }, [serviceAreas, cityFilter]);

  const visibleLockers = useMemo(
    () =>
      networkLockers.filter((locker) => {
        if (cityFilter && cityFilter !== 'all' && locker.serviceAreaCityId !== cityFilter) return false;
        if (zoneFilter && zoneFilter !== 'all' && locker.serviceAreaId !== zoneFilter) return false;
        if (statusFilter !== 'all' && locker.status !== statusFilter) return false;
        return matchesListSearch(
          searchQuery,
          locker.name,
          locker.code,
          locker.address,
          locker.serviceAreaName,
          locker.serviceAreaCity,
        );
      }),
    [networkLockers, cityFilter, zoneFilter, statusFilter, searchQuery],
  );

  const mapMarkers = useMemo<LockerMapMarkerDto[]>(() => {
    return visibleLockers
      .filter((locker) => locker.latitude != null && locker.longitude != null)
      .map((locker) => ({
        id: locker.id,
        name: locker.name,
        address: locker.address,
        latitude: locker.latitude!,
        longitude: locker.longitude!,
        type: locker.type,
        typeLabel: locker.typeLabel,
        status: locker.status,
        statusLabel: locker.statusLabel,
        availableCompartments: locker.compartmentCounts.available,
        availableSlots: locker.availableSlots,
        rows: locker.rows,
        columns: locker.columns,
        contactPhone: locker.contactPhone,
      }));
  }, [visibleLockers]);

  function selectLocker(lockerId: string, source: 'map' | 'table' = 'table') {
    setSelectedLockerId(lockerId);
    if (source !== 'table') return;
    const locker = visibleLockers.find((item) => item.id === lockerId);
    if (locker?.latitude == null || locker.longitude == null) return;
    setMapFocus({
      latitude: locker.latitude,
      longitude: locker.longitude,
      zoom: 14,
      key: Date.now(),
    });
  }

  useEffect(() => {
    if (!selectedLockerId) return;
    const row = document.querySelector(`[data-row-id="${selectedLockerId}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedLockerId]);

  const columns = useMemo<DataTableColumn<LockerSummaryDto>[]>(
    () => [
      {
        id: 'name',
        header: 'Casier',
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <TableCellStack
            primary={
              <Link
                href={`/tableau-de-bord/casiers/${row.id}`}
                className="nb-data-table__link"
                onClick={(event) => event.stopPropagation()}
              >
                {row.name}
              </Link>
            }
            secondary={row.code}
          />
        ),
      },
      {
        id: 'location',
        header: 'Adresse',
        sortable: true,
        sortValue: (row) => row.address,
        hideOnMobile: true,
        cell: (row) => <TruncatedText maxWidth={260}>{row.address}</TruncatedText>,
      },
      {
        id: 'zone',
        header: 'Zone',
        sortable: true,
        sortValue: (row) => formatLockerZoneLabel(row),
        cell: (row) => (
          <span style={{ color: colors.textMuted }}>{formatLockerZoneLabel(row)}</span>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.statusLabel,
        cell: (row) => <LockerStatusBadge status={row.status} />,
      },
      {
        id: 'occupancy',
        header: 'Compartiments',
        hideOnMobile: true,
        numeric: true,
        cell: (row) =>
          usesCompartmentGrid(row.type) ? (
            <span style={{ whiteSpace: 'nowrap', fontSize: typography.caption.fontSize }}>
              {row.compartmentCounts.available} disp. · {row.compartmentCounts.reserved} rés.{' '}
              · {row.compartmentCounts.occupied} occ. / {row.compartmentCounts.total}
            </span>
          ) : (
            `${row.availableSlots} / ${row.maxCapacity ?? '—'}`
          ),
      },
    ],
    [],
  );

  return (
    <div className="locker-network-split">
      <div className="locker-network-split__map">
        <LockerGoogleMap
          lockers={mapMarkers}
          selectedLockerId={selectedLockerId}
          hoveredLockerId={hoveredLockerId ?? undefined}
          onSelectLocker={(lockerId) => selectLocker(lockerId, 'map')}
          onHoverLocker={setHoveredLockerId}
          mapFocus={mapFocus}
          pinStyle="network"
          height="100%"
        />
      </div>

      <div className="locker-network-split__list">
      <DataTable
        columns={columns}
        rows={visibleLockers}
        getRowId={(row) => row.id}
        selectedRowId={selectedLockerId}
        hoveredRowId={hoveredLockerId}
        onRowSelect={selectLocker}
        onRowHover={setHoveredLockerId}
        search={
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un casier par nom, code ou adresse…"
            ariaLabel="Rechercher un casier par nom, code ou adresse"
          />
        }
        filters={
          <FilterToolbar
            embedded
            onClearAll={() => {
              setCityFilter('all');
              setZoneFilter('all');
              setStatusFilter('all');
            }}
            filters={[
              {
                id: 'locker-city',
                label: 'Ville',
                value: cityFilter || 'all',
                emptyValue: 'all',
                options: cityOptions,
                onChange: (next) => {
                  setCityFilter(next);
                  if (next !== 'all' && zoneFilter !== 'all') {
                    const stillValid = zonesForCity(serviceAreas, next).some((area) => area.id === zoneFilter);
                    if (!stillValid) setZoneFilter('all');
                  }
                },
              },
              {
                id: 'locker-zone',
                label: 'Zone',
                value: zoneFilter || 'all',
                emptyValue: 'all',
                options: zoneOptions,
                onChange: setZoneFilter,
              },
              {
                id: 'locker-status',
                label: 'Statut',
                value: statusFilter,
                emptyValue: 'all',
                options: STATUS_OPTIONS,
                onChange: (next) => setStatusFilter(next as StatusFilter),
              },
            ]}
          />
        }
        caption={
          visibleLockers.length > 0 &&
          (zoneFilter !== 'all' || cityFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim())
            ? `${visibleLockers.length} casier${visibleLockers.length > 1 ? 's' : ''} sur ${networkLockers.length}`
            : undefined
        }
        emptyTitle={
          searchQuery.trim() || cityFilter !== 'all' || zoneFilter !== 'all' || statusFilter !== 'all'
            ? 'Aucun résultat'
            : 'Aucun casier'
        }
        emptyDescription={
          searchQuery.trim() || cityFilter !== 'all' || zoneFilter !== 'all' || statusFilter !== 'all'
            ? 'Aucun casier ne correspond aux filtres actuels.'
            : 'Les casiers Eveider apparaîtront ici.'
        }
        emptyIcon={searchQuery.trim() ? <IconSearch /> : <IconMapPin />}
        emptyAction={
          searchQuery.trim() || cityFilter !== 'all' || zoneFilter !== 'all' || statusFilter !== 'all' ? (
            <button
              type="button"
              className="nb-btn nb-btn-secondary nb-btn--sm"
              onClick={() => {
                setSearchQuery('');
                setCityFilter('all');
                setZoneFilter('all');
                setStatusFilter('all');
              }}
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <Link href="/tableau-de-bord/casiers/nouveau" className="nb-btn nb-btn-primary nb-btn--sm">
              Nouveau casier
            </Link>
          )
        }
        sortBy="name"
        pageSize={DEFAULT_TABLE_PAGE_SIZE}
        rowPrimaryAction={(row) => ({
          label: 'Détails',
          href: `/tableau-de-bord/casiers/${row.id}`,
        })}
      />
      </div>
    </div>
  );
}
