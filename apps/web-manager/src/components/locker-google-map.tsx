'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import type { LockerMapMarkerDto } from '@/lib/locker-presenter';
import {
  BUSINESS_LOCATION_PIN,
  DRC_MAP_RESTRICTION,
  getDefaultMapCenter,
  getGoogleMapsApiKey,
  lockerPinColor,
  LOCKER_PIN_COLORS,
  NETWORK_LOCKER_PIN,
  type MapSearchViewport,
} from '@/lib/google-maps';
import { APIProvider, Map, Marker, useApiIsLoaded, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo } from 'react';

/** Classic teardrop pin (viewBox 0 0 24 24), tip at (12, 22). */
const MAP_PIN_PATH =
  'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z';

export type BusinessLocationMapMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type LockerGoogleMapProps = {
  lockers: LockerMapMarkerDto[];
  selectedLockerId?: string;
  onSelectLocker?: (lockerId: string) => void;
  onHoverLocker?: (lockerId: string | null) => void;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  highlightLockerId?: string;
  hoveredLockerId?: string;
  /** availability = capacity-tinted; network = uniform Eveider green. */
  pinStyle?: 'availability' | 'network';
  businessMarkers?: BusinessLocationMapMarker[];
  selectedBusinessId?: string;
  draftMarker?: { latitude: number; longitude: number } | null;
  draftMarkerDraggable?: boolean;
  onDraftMarkerDrag?: (coords: { latitude: number; longitude: number }) => void;
  mapFocus?: { latitude: number; longitude: number; zoom?: number; key?: number } | null;
  onViewportChange?: (viewport: MapSearchViewport) => void;
  height?: number | string;
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
  pinStyle,
  onSelect,
  onHover,
}: {
  locker: LockerMapMarkerDto;
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
  pinStyle: 'availability' | 'network';
  onSelect?: (lockerId: string) => void;
  onHover?: (lockerId: string | null) => void;
}) {
  const ready = useApiIsLoaded();
  const fillColor =
    pinStyle === 'network'
      ? NETWORK_LOCKER_PIN
      : lockerPinColor(locker.availableCompartments, locker.status);
  const strokeColor = selected || hovered ? LOCKER_PIN_COLORS.selected : '#ffffff';

  if (!ready) return null;

  const icon =
    pinStyle === 'network'
      ? {
          path: MAP_PIN_PATH,
          fillColor,
          fillOpacity: 1,
          strokeColor,
          strokeWeight: selected ? 2.5 : hovered ? 2 : 1.5,
          scale: selected ? 1.7 : hovered ? 1.5 : 1.35,
          anchor: new google.maps.Point(12, 22),
        }
      : {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selected ? 11 : hovered ? 9 : 7,
          fillColor,
          fillOpacity: 1,
          strokeColor,
          strokeWeight: selected ? 3 : hovered ? 2.5 : 2,
        };

  return (
    <Marker
      position={{ lat: locker.latitude, lng: locker.longitude }}
      title={`${locker.name} · ${locker.availableSlots} dispo.`}
      clickable={interactive}
      zIndex={selected ? 4 : hovered ? 3 : 1}
      icon={icon}
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

function BusinessLocationPin({
  marker,
  selected,
}: {
  marker: BusinessLocationMapMarker;
  selected: boolean;
}) {
  const ready = useApiIsLoaded();
  if (!ready) return null;

  return (
    <Marker
      position={{ lat: marker.latitude, lng: marker.longitude }}
      title={marker.name}
      clickable={false}
      zIndex={selected ? 5 : 2}
      icon={{
        path: MAP_PIN_PATH,
        fillColor: BUSINESS_LOCATION_PIN,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: selected ? 2.5 : 1.5,
        scale: selected ? 1.6 : 1.35,
        anchor: new google.maps.Point(12, 22),
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
  pinStyle = 'availability',
  businessMarkers = [],
  selectedBusinessId,
  draftMarker,
  draftMarkerDraggable = false,
  onDraftMarkerDrag,
  mapFocus,
  onViewportChange,
  height = 420,
  interactive = true,
}: LockerGoogleMapProps) {
  const frameHeight = typeof height === 'number' ? height : undefined;
  const frameHeightCss = typeof height === 'number' ? undefined : height;
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
    const business = businessMarkers.find((m) => m.id === selectedBusinessId) ?? businessMarkers[0];
    if (business) {
      return { lat: business.latitude, lng: business.longitude };
    }
    const defaultCenter = getDefaultMapCenter();
    return { lat: defaultCenter.latitude, lng: defaultCenter.longitude };
  }, [lockers, selectedLockerId, businessMarkers, selectedBusinessId]);

  if (!apiKey) {
    return (
      <div
        style={{
          ...webCardStyle,
          height: frameHeight ?? frameHeightCss ?? '100%',
          minHeight: frameHeight ?? 280,
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
    <div
      style={{
        height: frameHeight ?? frameHeightCss ?? '100%',
        minHeight: frameHeight ?? 280,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
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
          {businessMarkers.map((marker) => (
            <BusinessLocationPin
              key={marker.id}
              marker={marker}
              selected={marker.id === selectedBusinessId}
            />
          ))}
          {lockers.map((locker) => (
            <LockerMapPin
              key={locker.id}
              locker={locker}
              selected={locker.id === selectedLockerId}
              hovered={locker.id === highlightedId}
              interactive={interactive}
              pinStyle={pinStyle}
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
