'use client';

import { colors, radius } from '@eveider/config-ui';
import { useEffect, useState } from 'react';
import { LockerCard, type LockerOption } from './locker-card';
import { LockerMapbox } from './locker-mapbox';
import type { LockerMapMarkerDto } from '@/lib/locker-presenter';

type LockerPickerProps = {
  lockers: LockerOption[];
  selectedLockerId: string;
  onSelectLocker: (lockerId: string) => void;
};

export function LockerPicker({ lockers, selectedLockerId, onSelectLocker }: LockerPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    // Media query to detect screen width >= 900px
    const mediaQuery = window.matchMedia('(min-width: 900px)');
    setIsLargeScreen(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setIsLargeScreen(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  // Filter lockers based on search term
  const filteredLockers = lockers.filter(
    (locker) =>
      locker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locker.address.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const mapMarkers = filteredLockers
    .filter(
      (locker): locker is LockerOption & { latitude: number; longitude: number } =>
        locker.latitude != null && locker.longitude != null,
    )
    .map(
      (locker): LockerMapMarkerDto => ({
        id: locker.id,
        name: locker.name,
        address: locker.address,
        latitude: locker.latitude,
        longitude: locker.longitude,
        status: 'active',
        statusLabel: 'ACTIF',
        availableCompartments: locker.availableCompartments,
        availableBySize: locker.availableBySize,
        rows: locker.rows ?? 3,
        columns: locker.columns ?? 3,
        distanceKm: locker.distanceKm,
      }),
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Header controls: Search & Mobile View Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Search Input */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="RECHERCHER UN CASIER (EX: GOMBE)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: 44,
              padding: '0 12px 0 38px',
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              outline: 'none',
              background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23121212' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E") no-repeat 14px center`,
              backgroundColor: colors.surface,
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                color: colors.secondary,
                opacity: 0.5,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* View Switcher Controls (visible only on mobile) */}
        {!isLargeScreen && (
          <div
            style={{
              display: 'flex',
              background: colors.border,
              padding: '3px',
              borderRadius: radius.button,
              height: '44px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '0 1.25rem',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                backgroundColor: viewMode === 'list' ? colors.surface : 'transparent',
                color: colors.secondary,
                transition: 'all 0.15s ease-in-out',
              }}
            >
              LISTE
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                padding: '0 1.25rem',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                backgroundColor: viewMode === 'map' ? colors.surface : 'transparent',
                color: colors.secondary,
                transition: 'all 0.15s ease-in-out',
              }}
            >
              CARTE MAPBOX
            </button>
          </div>
        )}
      </div>

      {/* Split view desktop / switchable mobile layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isLargeScreen ? '1fr 1.2fr' : '1fr',
          gap: '1.25rem',
        }}
      >
        {/* List display */}
        <div
          style={{
            display: isLargeScreen || viewMode === 'list' ? 'grid' : 'none',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
            maxHeight: isLargeScreen ? '400px' : 'none',
            overflowY: isLargeScreen ? 'auto' : 'visible',
            paddingRight: isLargeScreen ? '6px' : 0,
          }}
        >
          {filteredLockers.length === 0 ? (
            <p
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                fontWeight: 500,
                padding: '2rem 0',
                color: colors.secondary,
                opacity: 0.7,
                fontSize: '0.875rem',
              }}
            >
              AUCUN CASIER CORRESPONDANT
            </p>
          ) : (
            filteredLockers.map((locker) => (
              <LockerCard
                key={locker.id}
                locker={locker}
                selected={locker.id === selectedLockerId}
                onSelect={onSelectLocker}
              />
            ))
          )}
        </div>

        {/* Map display */}
        <div
          style={{
            display: isLargeScreen || viewMode === 'map' ? 'block' : 'none',
            width: '100%',
          }}
        >
          <LockerMapbox
            lockers={mapMarkers}
            selectedLockerId={selectedLockerId}
            onSelectLocker={onSelectLocker}
            height={400}
          />
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: colors.secondary,
              opacity: 0.6,
              textAlign: 'center',
            }}
          >
            Cliquez sur un marqueur de casier sur la carte pour le sélectionner.
          </p>
        </div>
      </div>
    </div>
  );
}
