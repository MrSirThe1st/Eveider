'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { usesCompartmentGrid } from '@eveider/domain';
import { EmptyState, IconMapPin, IconSearch } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LockerStatusBadge } from '@/components/locker-status-badge';
import { ListSearchField } from '@/components/list-search-field';
import type { LockerSummaryDto } from '@/lib/locker-presenter';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';
import { matchesListSearch } from '@/lib/list-search';

type LockerListProps = {
  lockers: LockerSummaryDto[];
  serviceAreas?: ServiceAreaOptionDto[];
};

export function LockerList({ lockers, serviceAreas = [] }: LockerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceAreaId, setServiceAreaId] = useState('');

  const filteredLockers = useMemo(
    () =>
      lockers.filter((locker) => {
        if (serviceAreaId && locker.serviceAreaId !== serviceAreaId) return false;
        return matchesListSearch(
          searchQuery,
          locker.name,
          locker.code,
          locker.address,
          locker.city,
          locker.serviceAreaName,
        );
      }),
    [lockers, searchQuery, serviceAreaId],
  );

  if (lockers.length === 0) {
    return (
      <EmptyState
        title="Aucun point Eveider"
        description="Placez un repère sur la carte pour créer le premier point, ou exécutez pnpm db:seed."
        icon={<IconMapPin />}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: '1rem',
          display: 'grid',
          gap: '0.75rem',
          gridTemplateColumns: serviceAreas.length > 0 ? 'minmax(0, 1fr) 220px' : '1fr',
        }}
      >
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un point par code ou nom…"
          ariaLabel="Rechercher un point Eveider"
        />
        {serviceAreas.length > 0 ? (
          <select
            value={serviceAreaId}
            onChange={(event) => setServiceAreaId(event.target.value)}
            aria-label="Filtrer par zone de service"
            style={{
              ...webInputStyle,
              height: 42,
              padding: '0 10px',
            }}
          >
            <option value="">Toutes les zones</option>
            {serviceAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '0.8125rem' }}>
        {searchQuery.trim() || serviceAreaId
          ? `${filteredLockers.length} point${filteredLockers.length > 1 ? 's' : ''} sur ${lockers.length}`
          : `${lockers.length} points`}
      </p>
      {filteredLockers.length === 0 ? (
        <EmptyState
          compact
          title="Aucun point pour cette recherche"
          description="Essayez un autre code EVP ou nom de point."
          icon={<IconSearch />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredLockers.map((locker) => (
            <Link
              key={locker.id}
              href={`/tableau-de-bord/points/${locker.id}`}
              style={{
                display: 'block',
                ...webCardStyle,
                padding: '1.25rem 1.5rem',
                textDecoration: 'none',
                color: colors.secondary,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{locker.name}</p>
                  <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.8125rem' }}>
                    {locker.typeLabel} · {locker.code}
                    {locker.serviceAreaName ? ` · ${locker.serviceAreaName}` : ''}
                    {locker.city && locker.city !== locker.serviceAreaName ? ` · ${locker.city}` : ''}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
                    {locker.address}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.8125rem' }}>
                    {usesCompartmentGrid(locker.type)
                      ? `${locker.compartmentCounts.available} dispo · ${locker.compartmentCounts.occupied} occupé · ${locker.compartmentCounts.reserved} réservé`
                      : `${locker.availableSlots} places libres / ${locker.maxCapacity ?? '—'} max`}
                  </p>
                </div>
                <LockerStatusBadge status={locker.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
