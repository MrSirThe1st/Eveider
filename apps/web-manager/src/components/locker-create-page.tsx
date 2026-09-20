'use client';

import { colors, radius, borderSubtle, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { LoadingSpinner } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { LockerCreatePanel, type CreatePointPayload } from '@/components/locker-create-panel';
import { LockerGoogleMap } from '@/components/locker-google-map';
import type { CityOptionDto } from '@/lib/city-presenter';
import {
  reverseGeocodeGoogle,
  searchGooglePlaces,
  zoomForPlaceType,
  type MapPlace,
  type MapSearchViewport,
} from '@/lib/google-maps';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';

type MapFocus = {
  latitude: number;
  longitude: number;
  zoom?: number;
  key: number;
};

const inputStyle: React.CSSProperties = {
  ...webInputStyle,
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
};

type LockerCreatePageProps = {
  cities: CityOptionDto[];
  serviceAreas: ServiceAreaOptionDto[];
};

export function LockerCreatePage({ cities, serviceAreas }: LockerCreatePageProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<MapPlace[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
  const [mapViewport, setMapViewport] = useState<MapSearchViewport | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const searchRequestId = useRef(0);

  useEffect(() => {
    const query = locationSearch.trim();
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
          if (requestId !== searchRequestId.current) return;
          setSearchResults(places);
          setError(null);
        } catch {
          if (requestId !== searchRequestId.current) return;
          setError('Recherche impossible. Vérifiez votre clé Google Maps.');
        } finally {
          if (requestId === searchRequestId.current) {
            setSearching(false);
          }
        }
      })();
    }, 320);

    return () => window.clearTimeout(timer);
  }, [locationSearch, mapViewport]);

  function panMapTo(latitude: number, longitude: number, zoom = 15) {
    setMapFocus({ latitude, longitude, zoom, key: Date.now() });
  }

  function selectSearchResult(place: MapPlace) {
    setSelectedResultId(place.id);
    setPendingAddress(null);
    setError(null);
    if (!address.trim()) setAddress(place.label);
    panMapTo(place.latitude, place.longitude, zoomForPlaceType(place.placeType));
    setDraft({ latitude: place.latitude, longitude: place.longitude });
    setLocationSearch(place.label);
    setSearchResults([]);
  }

  async function handleMapPlacement(coords: { latitude: number; longitude: number }) {
    setDraft(coords);
    setSelectedResultId(null);
    if (address.trim()) {
      setPendingAddress(null);
      return;
    }
    setReverseLoading(true);
    try {
      const resolved = await reverseGeocodeGoogle(coords.latitude, coords.longitude);
      setPendingAddress(resolved);
    } catch {
      setPendingAddress(null);
    } finally {
      setReverseLoading(false);
    }
  }

  async function createLocker(input: CreatePointPayload) {
    if (!draft) {
      setError('Placez un repère sur la carte pour confirmer l’emplacement exact.');
      return;
    }
    if (!input.serviceAreaId) {
      setError('Choisissez une zone. Elle n’est jamais assignée automatiquement.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          latitude: draft.latitude,
          longitude: draft.longitude,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Création échouée');
        return;
      }
      router.push(`/tableau-de-bord/casiers/${result.data.locker.id}`);
      router.refresh();
    } catch {
      setError('Impossible de créer le casier.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {error ? <FlashBanner message={error} variant="error" /> : null}
      {saving ? <LoadingSpinner label="Création du casier…" /> : null}

      <LockerGoogleMap
        lockers={[]}
        draftMarker={draft}
        draftMarkerDraggable={Boolean(draft)}
        onDraftMarkerDrag={(coords) => void handleMapPlacement(coords)}
        mapFocus={mapFocus}
        onViewportChange={setMapViewport}
        onMapClick={(coords) => void handleMapPlacement(coords)}
        height={420}
      />

      <section style={{ ...webCardStyle, padding: '1rem 1.25rem', position: 'relative', zIndex: 2 }}>
        <label style={{ display: 'block' }}>
          <span
            style={{
              display: 'block',
              marginBottom: '0.35rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: colors.textMuted,
            }}
          >
            RECHERCHER UN LIEU
          </span>
          <input
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            placeholder="Avenue, bâtiment, quartier, ville…"
            style={{ ...inputStyle, marginTop: 0, width: '100%' }}
            autoComplete="off"
            aria-label="Rechercher un lieu"
          />
        </label>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
          Suggestions Google Places. Le clic sur la carte place le pin — il ne crée pas le casier.
        </p>
        {searching ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>Recherche…</p>
        ) : null}
        {searchResults.length > 0 ? (
          <div
            style={{
              marginTop: '0.75rem',
              border: borderSubtle(),
              borderRadius: radius.button,
              overflow: 'hidden',
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {searchResults.map((place, index) => (
              <button
                key={place.id}
                type="button"
                onClick={() => selectSearchResult(place)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderBottom: index < searchResults.length - 1 ? borderSubtle() : 'none',
                  background: place.id === selectedResultId ? colors.successMuted : colors.surface,
                  color: place.id === selectedResultId ? colors.successFg : colors.secondary,
                  fontWeight: place.id === selectedResultId ? 600 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 6 }}>{index + 1}.</span>
                {place.label}
              </button>
            ))}
          </div>
        ) : null}
        {reverseLoading ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
            Recherche de l’adresse…
          </p>
        ) : null}
        {pendingAddress ? (
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setAddress(pendingAddress);
                setPendingAddress(null);
              }}
              className="nb-btn nb-btn-secondary nb-btn--sm"
            >
              Utiliser « {pendingAddress} »
            </button>
          </div>
        ) : null}
      </section>

      <LockerCreatePanel
        address={address}
        onAddressChange={setAddress}
        placementConfirmed={Boolean(draft)}
        latitude={draft?.latitude ?? null}
        longitude={draft?.longitude ?? null}
        saving={saving}
        cities={cities}
        serviceAreas={serviceAreas}
        onCreate={(input) => void createLocker(input)}
      />
    </div>
  );
}
