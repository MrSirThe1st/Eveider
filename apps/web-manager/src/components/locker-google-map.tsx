'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import type { LockerMapMarkerDto } from '@/lib/locker-presenter';
import {
  DRC_MAP_RESTRICTION,
  getDefaultMapCenter,
  getGoogleMapsApiKey,
  lockerPinColor,
  LOCKER_PIN_COLORS,
  type MapSearchViewport,
} from '@/lib/google-maps';
import { APIProvider, Map, Marker, useApiIsLoaded, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo } from 'react';

export type LockerGoogleMapProps = {
  lockers: LockerMapMarkerDto[];
  selectedLockerId?: string;
  onSelectLocker?: (lockerId: string) => void;
  onHoverLocker?: (lockerId: string | null) => void;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  highlightLockerId?: string;
  hoveredLockerId?: string;
  draftMarker?: { latitude: number; longitude: number } | null;
  draftMarkerDraggable?: boolean;
  onDraftMarkerDrag?: (coords: { latitude: number; longitude: number }) => void;
  mapFocus?: { latitude: number; longitude: number; zoom?: number; key?: number } | null;
  onViewportChange?: (viewport: MapSearchViewport) => void;
  height?: number;
  interactive?: boolean;
};

function MapCameraController({
  mapFocus,
  onViewportChange,
}: {
  mapFocus?: LockerGoogleMapProps['mapFocus'];
  onViewportChange?: LockerGoogleMapProps['onViewportChange'];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !mapFocus) return;
    map.panTo({ lat: mapFocus.latitude, lng: mapFocus.longitude });
    map.setZoom(mapFocus.zoom ?? 15);
  }, [map, mapFocus?.key, mapFocus?.latitude, mapFocus?.longitude, mapFocus?.zoom]);

  useEffect(() => {
    if (!map || !onViewportChange) return;

    const report = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      if (!center || !bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      onViewportChange({
        latitude: center.lat(),
        longitude: center.lng(),
        zoom: map.getZoom() ?? 12,
        bounds: {
          west: sw.lng(),
          south: sw.lat(),
          east: ne.lng(),
          north: ne.lat(),
        },
      });
    };

    report();
    const idleListener = map.addListener('idle', report);
    return () => {
      idleListener.remove();
    };
  }, [map, onViewportChange]);

  return null;
}

function LockerMapPin({
  locker,
  selected,
  hovered,
  interactive,
  onSelect,
  onHover,
}: {
  locker: LockerMapMarkerDto;
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
  onSelect?: (lockerId: string) => void;
  onHover?: (lockerId: string | null) => void;
}) {
  const ready = useApiIsLoaded();
  const fillColor = lockerPinColor(locker.availableCompartments, locker.status);

  if (!ready) return null;

  return (
    <Marker
      position={{ lat: locker.latitude, lng: locker.longitude }}
      title={`${locker.name} · ${locker.availableSlots} dispo.`}
      clickable={interactive}
      zIndex={selected ? 4 : hovered ? 3 : 1}
      icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: selected ? 11 : hovered ? 9 : 7,
        fillColor,
        fillOpacity: 1,
        strokeColor: selected || hovered ? LOCKER_PIN_COLORS.selected : '#ffffff',
        strokeWeight: selected ? 3 : hovered ? 2.5 : 2,
      }}
      onClick={() => {
        if (interactive) onSelect?.(locker.id);
      }}
      onMouseOver={() => {
        if (interactive) onHover?.(locker.id);
      }}
      onMouseOut={() => {
        if (interactive) onHover?.(null);
      }}
    />
  );
}

export function LockerGoogleMap({
  lockers,
  selectedLockerId,
  onSelectLocker,
  onHoverLocker,
  onMapClick,
  highlightLockerId,
  hoveredLockerId,
  draftMarker,
  draftMarkerDraggable = false,
  onDraftMarkerDrag,
  mapFocus,
  onViewportChange,
  height = 420,
  interactive = true,
}: LockerGoogleMapProps) {
  const apiKey = useMemo(() => {
    try {
      return getGoogleMapsApiKey();
    } catch {
      return '';
    }
  }, []);

  const highlightedId = hoveredLockerId ?? highlightLockerId;

  const center = useMemo(() => {
    if (lockers.length > 0) {
      const target = lockers.find((l) => l.id === selectedLockerId) ?? lockers[0]!;
      return { lat: target.latitude, lng: target.longitude };
    }
    const defaultCenter = getDefaultMapCenter();
    return { lat: defaultCenter.latitude, lng: defaultCenter.longitude };
  }, [lockers, selectedLockerId]);

  if (!apiKey) {
    return (
      <div
        style={{
          ...webCardStyle,
          height,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: colors.secondary,
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        Configurez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY dans .env pour afficher la carte.
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <APIProvider apiKey={apiKey} libraries={['places']}>
        <Map
          defaultCenter={center}
          defaultZoom={11.5}
          gestureHandling={interactive ? 'greedy' : 'none'}
          disableDefaultUI
          zoomControl={interactive}
          style={{ width: '100%', height: '100%' }}
          restriction={DRC_MAP_RESTRICTION}
          minZoom={4.5}
          clickableIcons={false}
          onClick={
            onMapClick
              ? (event) => {
                  const lat = event.detail.latLng?.lat;
                  const lng = event.detail.latLng?.lng;
                  if (lat == null || lng == null) return;
                  onMapClick({ latitude: lat, longitude: lng });
                }
              : undefined
          }
        >
          <MapCameraController mapFocus={mapFocus} onViewportChange={onViewportChange} />
          {lockers.map((locker) => (
            <LockerMapPin
              key={locker.id}
              locker={locker}
              selected={locker.id === selectedLockerId}
              hovered={locker.id === highlightedId}
              interactive={interactive}
              onSelect={onSelectLocker}
              onHover={onHoverLocker}
            />
          ))}
          {draftMarker ? (
            <Marker
              position={{ lat: draftMarker.latitude, lng: draftMarker.longitude }}
              title={draftMarkerDraggable ? 'Glissez pour ajuster la position' : 'Nouveau casier'}
              draggable={draftMarkerDraggable}
              onDragEnd={
                onDraftMarkerDrag
                  ? (event) => {
                      const lat = event.latLng?.lat();
                      const lng = event.latLng?.lng();
                      if (lat == null || lng == null) return;
                      onDraftMarkerDrag({ latitude: lat, longitude: lng });
                    }
                  : undefined
              }
            />
          ) : null}
        </Map>
      </APIProvider>
    </div>
  );
}

/** @deprecated Use LockerGoogleMap */
export const LockerMapbox = LockerGoogleMap;
export type LockerMapboxProps = LockerGoogleMapProps;
