'use client';

import { colors, borderSubtle, radius, webInputStyle } from '@eveider/config-ui';
import { useEffect, useRef, useState } from 'react';
import { LockerGoogleMap } from '@/components/locker-google-map';
import {
  reverseGeocodeGoogle,
  searchGooglePlaces,
  zoomForPlaceType,
  type MapPlace,
  type MapSearchViewport,
} from '@/lib/google-maps';

export type AddressMapValue = {
  street: string;
  lat: number | null;
  lng: number | null;
};

export type AddressMapPickerProps = {
  value: AddressMapValue;
  onChange: (value: AddressMapValue) => void;
  onSearchError?: (message: string) => void;
  label?: string;
  placeholder?: string;
  mapTitle?: string;
  mapHint?: string;
  mapHeight?: number;
  /** When false, search effect is paused (e.g. modal closed). Default true. */
  active?: boolean;
  /** Bump to reset internal UI (clear suggestions / set suppress). */
  resetKey?: string | number;
};

export function AddressMapPicker({
  value,
  onChange,
  onSearchError,
  label = 'Adresse',
  placeholder = 'Rechercher une adresse ou un lieu…',
  mapTitle = 'Position exacte',
  mapHint = 'Déplacez le repère si nécessaire pour indiquer précisément l’emplacement.',
  mapHeight = 340,
  active = true,
  resetKey,
}: AddressMapPickerProps) {
  const [addressQuery, setAddressQuery] = useState(value.street);
  const [searchResults, setSearchResults] = useState<MapPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapViewport, setMapViewport] = useState<MapSearchViewport | null>(null);
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    key: number;
  } | null>(
    value.lat != null && value.lng != null
      ? { latitude: value.lat, longitude: value.lng, zoom: 16, key: Date.now() }
      : null,
  );
  const searchRequestId = useRef(0);
  /** After picking a suggestion, ignore search until the user types again. */
  const suppressSearchRef = useRef(Boolean(value.street.trim()));
  const onChangeRef = useRef(onChange);
  const onSearchErrorRef = useRef(onSearchError);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  onSearchErrorRef.current = onSearchError;
  valueRef.current = value;

  useEffect(() => {
    suppressSearchRef.current = Boolean(value.street.trim());
    searchRequestId.current += 1;
    setAddressQuery(value.street);
    setSearchResults([]);
    setSearching(false);
    if (value.lat != null && value.lng != null) {
      setMapFocus({
        latitude: value.lat,
        longitude: value.lng,
        zoom: 16,
        key: Date.now(),
      });
    } else {
      setMapFocus(null);
    }
    // resetKey intentionally drives re-sync when parent opens create/edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when key changes
  }, [resetKey]);

  useEffect(() => {
    if (!active) return;
    if (suppressSearchRef.current) {
      setSearching(false);
      return;
    }

    const query = addressQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const requestId = ++searchRequestId.current;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const places = await searchGooglePlaces(query, {
            limit: 8,
            viewport: mapViewport ?? undefined,
          });
          if (requestId !== searchRequestId.current || suppressSearchRef.current) return;
          setSearchResults(places);
        } catch {
          if (requestId !== searchRequestId.current) return;
          onSearchErrorRef.current?.(
            'Recherche impossible. Vérifiez votre clé Google Maps.',
          );
        } finally {
          if (requestId === searchRequestId.current) setSearching(false);
        }
      })();
    }, 320);

    return () => window.clearTimeout(timer);
  }, [addressQuery, mapViewport, active]);

  function selectSearchResult(place: MapPlace) {
    suppressSearchRef.current = true;
    searchRequestId.current += 1;
    setSearchResults([]);
    setSearching(false);
    setAddressQuery(place.label);
    onChangeRef.current({
      street: place.label,
      lat: place.latitude,
      lng: place.longitude,
    });
    setMapFocus({
      latitude: place.latitude,
      longitude: place.longitude,
      zoom: zoomForPlaceType(place.placeType),
      key: Date.now(),
    });
  }

  function onAddressInputChange(next: string) {
    suppressSearchRef.current = false;
    setAddressQuery(next);
    onChangeRef.current({
      street: next,
      lat: null,
      lng: null,
    });
    setMapFocus(null);
  }

  async function handleMapPlacement(coords: { latitude: number; longitude: number }) {
    const currentStreet = valueRef.current.street;
    onChangeRef.current({
      street: currentStreet,
      lat: coords.latitude,
      lng: coords.longitude,
    });
    setMapFocus({
      latitude: coords.latitude,
      longitude: coords.longitude,
      zoom: 17,
      key: Date.now(),
    });

    if (currentStreet.trim()) return;

    try {
      const resolved = await reverseGeocodeGoogle(coords.latitude, coords.longitude);
      if (resolved) {
        suppressSearchRef.current = true;
        setAddressQuery(resolved);
        onChangeRef.current({
          street: resolved,
          lat: coords.latitude,
          lng: coords.longitude,
        });
      }
    } catch {
      /* keep pin without address */
    }
  }

  const draft =
    value.lat != null && value.lng != null
      ? { latitude: value.lat, longitude: value.lng }
      : null;

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="ops-field-label">{label}</span>
          <input
            value={addressQuery}
            onChange={(e) => onAddressInputChange(e.target.value)}
            placeholder={placeholder}
            style={{ ...webInputStyle, width: '100%' }}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={searchResults.length > 0}
          />
        </label>
        {searching ? (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
            Recherche…
          </p>
        ) : null}
        {searchResults.length > 0 ? (
          <div
            role="listbox"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              marginTop: 4,
              border: borderSubtle(),
              borderRadius: radius.button,
              overflow: 'hidden',
              maxHeight: 220,
              overflowY: 'auto',
              background: colors.surface,
              boxShadow: '0 8px 24px rgba(18, 18, 18, 0.12)',
            }}
          >
            {searchResults.map((place, index) => (
              <button
                key={place.id}
                type="button"
                role="option"
                onClick={() => selectSearchResult(place)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.7rem 0.85rem',
                  border: 'none',
                  borderBottom: index < searchResults.length - 1 ? borderSubtle() : 'none',
                  background: colors.surface,
                  color: colors.secondary,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                {place.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: '0.55rem' }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: colors.secondary,
            }}
          >
            {mapTitle}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
            {mapHint}
          </p>
        </div>
        <LockerGoogleMap
          lockers={[]}
          draftMarker={draft}
          draftMarkerDraggable={Boolean(draft)}
          onDraftMarkerDrag={(coords) => void handleMapPlacement(coords)}
          mapFocus={mapFocus}
          onViewportChange={setMapViewport}
          onMapClick={(coords) => void handleMapPlacement(coords)}
          height={mapHeight}
        />
      </div>
    </div>
  );
}
