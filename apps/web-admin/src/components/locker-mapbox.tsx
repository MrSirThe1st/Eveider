'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import type { LockerMapMarkerDto } from '@/lib/locker-presenter';
import { getDefaultMapCenter, getMapboxToken, DRC_MAP_MAX_BOUNDS, lockerPinColor, MAPBOX_STYLE, type MapSearchViewport } from '@/lib/mapbox';
import { useEffect, useMemo, useRef } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export type LockerMapboxProps = {
  lockers: LockerMapMarkerDto[];
  selectedLockerId?: string;
  onSelectLocker?: (lockerId: string) => void;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  highlightLockerId?: string;
  draftMarker?: { latitude: number; longitude: number } | null;
  draftMarkerDraggable?: boolean;
  onDraftMarkerDrag?: (coords: { latitude: number; longitude: number }) => void;
  mapFocus?: { latitude: number; longitude: number; zoom?: number; key?: number } | null;
  onViewportChange?: (viewport: MapSearchViewport) => void;
  height?: number;
  interactive?: boolean;
};

export function LockerMapbox({
  lockers,
  selectedLockerId,
  onSelectLocker,
  onMapClick,
  highlightLockerId,
  draftMarker,
  draftMarkerDraggable = false,
  onDraftMarkerDrag,
  mapFocus,
  onViewportChange,
  height = 420,
  interactive = true,
}: LockerMapboxProps) {
  const mapRef = useRef<MapRef>(null);

  const token = useMemo(() => {
    try {
      return getMapboxToken();
    } catch {
      return '';
    }
  }, []);

  const center = useMemo(() => {
    if (lockers.length > 0) {
      const target = lockers.find((l) => l.id === selectedLockerId) ?? lockers[0]!;
      return { latitude: target.latitude, longitude: target.longitude };
    }
    return getDefaultMapCenter();
  }, [lockers, selectedLockerId]);

  useEffect(() => {
    if (!mapFocus || !mapRef.current) return;

    mapRef.current.flyTo({
      center: [mapFocus.longitude, mapFocus.latitude],
      zoom: mapFocus.zoom ?? 15,
      duration: 900,
    });
  }, [mapFocus?.key, mapFocus?.latitude, mapFocus?.longitude, mapFocus?.zoom]);

  function reportViewport() {
    const map = mapRef.current?.getMap();
    if (!map || !onViewportChange) return;

    const center = map.getCenter();
    const bounds = map.getBounds();
    if (!bounds) return;

    onViewportChange({
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
      bounds: {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      },
    });
  }

  if (!token) {
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
        Configurez NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN dans .env pour afficher la carte.
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          latitude: center.latitude,
          longitude: center.longitude,
          zoom: 11.5,
        }}
        mapStyle={MAPBOX_STYLE}
        style={{ width: '100%', height: '100%' }}
        maxBounds={DRC_MAP_MAX_BOUNDS}
        minZoom={4.5}
        onLoad={reportViewport}
        onMoveEnd={reportViewport}
        onClick={
          onMapClick
            ? (event) => {
                onMapClick({
                  latitude: event.lngLat.lat,
                  longitude: event.lngLat.lng,
                });
              }
            : undefined
        }
        cursor={onMapClick ? 'crosshair' : 'default'}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        {lockers.map((locker) => {
          const isSelected = locker.id === selectedLockerId;
          const isHighlight = locker.id === highlightLockerId;
          const pinColor = isSelected || isHighlight
            ? '#FFFFFF'
            : lockerPinColor(locker.availableCompartments, locker.status);

          return (
            <Marker
              key={locker.id}
              latitude={locker.latitude}
              longitude={locker.longitude}
              anchor="bottom"
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                onSelectLocker?.(locker.id);
              }}
            >
              <button
                type="button"
                title={locker.name}
                onClick={() => onSelectLocker?.(locker.id)}
                style={{
                  width: isSelected || isHighlight ? 18 : 14,
                  height: isSelected || isHighlight ? 18 : 14,
                  borderRadius: '50%',
                  border: `2px solid ${isSelected || isHighlight ? colors.primary : colors.secondary}`,
                  background: pinColor,
                  boxShadow: isSelected ? '0 0 0 4px rgba(9,212,11,0.35)' : '0 2px 8px rgba(0,0,0,0.35)',
                  cursor: interactive ? 'pointer' : 'default',
                  padding: 0,
                }}
              />
            </Marker>
          );
        })}
        {draftMarker ? (
          <Marker
            latitude={draftMarker.latitude}
            longitude={draftMarker.longitude}
            anchor="bottom"
            draggable={draftMarkerDraggable}
            onDragEnd={
              onDraftMarkerDrag
                ? (event) => {
                    onDraftMarkerDrag({
                      latitude: event.lngLat.lat,
                      longitude: event.lngLat.lng,
                    });
                  }
                : undefined
            }
          >
            <div
              title={draftMarkerDraggable ? 'Glissez pour ajuster la position' : 'Nouveau casier'}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: `3px solid ${colors.primary}`,
                background: '#FFFFFF',
                boxShadow: '0 0 0 5px rgba(9,212,11,0.4)',
                cursor: draftMarkerDraggable ? 'grab' : 'default',
              }}
            />
          </Marker>
        ) : null}
      </Map>
    </div>
  );
}
