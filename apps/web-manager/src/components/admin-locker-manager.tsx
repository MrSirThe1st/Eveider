'use client';

import { colors, radius, borderSubtle, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { usesCompartmentGrid } from '@eveider/domain';
import { LoadingSpinner } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { LockerCreatePanel, type CreatePointPayload } from '@/components/locker-create-panel';
import { LockerGoogleMap } from '@/components/locker-google-map';
import type { LockerMapMarkerDto, LockerSummaryDto } from '@/lib/locker-presenter';
import {
  reverseGeocodeGoogle,
  searchGooglePlaces,
  zoomForPlaceType,
  type MapPlace,
  type MapSearchViewport,
} from '@/lib/google-maps';

type DraftLocker = {
  latitude: number;
  longitude: number;
};

type MapFocus = {
  latitude: number;
  longitude: number;
  zoom?: number;
  key: number;
};

type PendingAddress = {
  address: string;
  latitude: number;
  longitude: number;
};

const inputStyle: React.CSSProperties = {
  ...webInputStyle,
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
};

type AdminLockerManagerProps = {
  lockers: LockerSummaryDto[];
};

export function AdminLockerManager({ lockers }: AdminLockerManagerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedLockerId, setSelectedLockerId] = useState<string>('');
  const [draft, setDraft] = useState<DraftLocker | null>(null);
  const [placementConfirmed, setPlacementConfirmed] = useState(false);
  const [address, setAddress] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<MapPlace[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
  const [mapViewport, setMapViewport] = useState<MapSearchViewport | null>(null);
  const [pendingAddress, setPendingAddress] = useState<PendingAddress | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const searchRequestId = useRef(0);

  const mapMarkers = useMemo<LockerMapMarkerDto[]>(() => {
    return lockers
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
  }, [lockers]);

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

  function setPlacement(coords: { latitude: number; longitude: number }, confirmed = true) {
    setDraft(coords);
    setPlacementConfirmed(confirmed);
    setSelectedLockerId('');
  }

  function selectSearchResult(place: MapPlace) {
    setSelectedResultId(place.id);
    setPendingAddress(null);
    setError(null);
    if (!address.trim()) {
      setAddress(place.label);
    }
    panMapTo(place.latitude, place.longitude, zoomForPlaceType(place.placeType));
    setPlacement({ latitude: place.latitude, longitude: place.longitude }, true);
    setLocationSearch(place.label);
    setSearchResults([]);
  }

  async function handleMapPlacement(coords: { latitude: number; longitude: number }) {
    setPlacement(coords, true);
    setSelectedResultId(null);

    if (address.trim()) {
      setPendingAddress(null);
      return;
    }

    setReverseLoading(true);
    try {
      const resolved = await reverseGeocodeGoogle(coords.latitude, coords.longitude);
      if (!resolved) {
        setPendingAddress(null);
        return;
      }
      setPendingAddress({
        address: resolved,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch {
      setPendingAddress(null);
    } finally {
      setReverseLoading(false);
    }
  }

  function confirmPendingAddress() {
    if (!pendingAddress) return;
    setAddress(pendingAddress.address);
    setPendingAddress(null);
  }

  async function createLocker(input: CreatePointPayload) {
    if (!draft || !placementConfirmed) {
      setError('Cliquez sur la carte ou déplacez le repère pour confirmer l’emplacement exact.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

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

      setSuccess(`Point ${input.name} créé (${result.data.locker.code}).`);
      setDraft(null);
      setPlacementConfirmed(false);
      setAddress('');
      setLocationSearch('');
      setSearchResults([]);
      setSelectedResultId(null);
      setPendingAddress(null);
      setMapFocus(null);
      router.refresh();
    } catch {
      setError('Impossible de créer le point.');
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelectedLocker() {
    if (!selectedLockerId) return;

    setArchiving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/lockers/${selectedLockerId}/archive`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Archivage échoué');
        return;
      }

      setSuccess('Point archivé.');
      setSelectedLockerId('');
      router.refresh();
    } catch {
      setError('Impossible d’archiver le point.');
    } finally {
      setArchiving(false);
    }
  }

  const placementHint = !draft
    ? 'Zoomez sur la zone, saisissez une adresse (suggestions en direct), ou cliquez sur la carte.'
    : !placementConfirmed
      ? 'Repère placé — glissez-le ou cliquez sur la carte pour confirmer l’emplacement exact.'
      : `Emplacement confirmé : ${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}`;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {error ? <FlashBanner message={error} variant="error" /> : null}
      {success ? <FlashBanner message={success} /> : null}
      {(saving || archiving) ? (
        <LoadingSpinner
          label={saving ? 'Création du point…' : 'Archivage…'}
          minHeight="4rem"
          size={28}
        />
      ) : null}

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ width: '100%' }}>
          <LockerGoogleMap
            lockers={mapMarkers}
            selectedLockerId={selectedLockerId}
            onSelectLocker={setSelectedLockerId}
            draftMarker={draft}
            draftMarkerDraggable={Boolean(draft)}
            onDraftMarkerDrag={(coords) => void handleMapPlacement(coords)}
            mapFocus={mapFocus}
            onViewportChange={setMapViewport}
            onMapClick={(coords) => void handleMapPlacement(coords)}
            height={580}
          />
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', fontWeight: 600, color: colors.secondary }}>
            {placementHint}
          </p>
          {reverseLoading ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
              Recherche de l’adresse…
            </p>
          ) : null}
          {pendingAddress ? (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                border: borderSubtle(),
                borderRadius: radius.button,
                background: colors.surface,
                display: 'grid',
                gap: '0.5rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>
                Utiliser cette adresse ?
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
                {pendingAddress.address}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={confirmPendingAddress}
                  style={{ ...webSecondaryButtonStyle, height: 36, flex: 1 }}
                >
                  OUI, REMPLIR
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAddress(null)}
                  style={{
                    ...webSecondaryButtonStyle,
                    height: 36,
                    flex: 1,
                    background: colors.surface,
                  }}
                >
                  IGNORER
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            ...webCardStyle,
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                1. RECHERCHER UN LIEU
              </p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: colors.secondary, opacity: 0.75 }}>
                Suggestions Google Places (RDC, français), priorisées autour de la carte. Certaines rues visibles peuvent ne pas être indexées.
              </p>

              <label style={{ display: 'block', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ADRESSE OU LIEU</span>
                <input
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Avenue, bâtiment, quartier, ville…"
                  style={inputStyle}
                  autoComplete="off"
                />
              </label>
              {searching ? (
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: colors.textMuted }}>
                  Recherche…
                </p>
              ) : null}

              {searchResults.length > 0 ? (
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                    2. CHOISIR UN RÉSULTAT
                  </p>
                  <div
                    style={{
                      border: borderSubtle(),
                      borderRadius: radius.button,
                      overflow: 'hidden',
                    }}
                  >
                    {searchResults.map((place, index) => {
                      const isSelected = place.id === selectedResultId;
                      return (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() => selectSearchResult(place)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.75rem',
                            border: 'none',
                            borderBottom:
                              index < searchResults.length - 1
                                ? borderSubtle()
                                : 'none',
                            background: isSelected ? '#E8FCE8' : colors.surface,
                            color: colors.secondary,
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontWeight: 700, marginRight: 6 }}>{index + 1}.</span>
                          {place.label}
                          <span style={{ display: 'block', marginTop: 2, fontSize: '0.6875rem', opacity: 0.7 }}>
                            {place.placeTypeLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
            <LockerCreatePanel
              address={address}
              onAddressChange={setAddress}
              placementConfirmed={placementConfirmed}
              saving={saving}
              onCreate={(input) => void createLocker(input)}
            />

            {selectedLockerId ? (
              <button
                type="button"
                disabled={archiving}
                onClick={() => void archiveSelectedLocker()}
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  height: 42,
                  background: colors.surface,
                  color: colors.danger,
                  border: `1px solid ${colors.danger}`,
                  borderRadius: radius.button,
                  fontWeight: 700,
                  cursor: archiving ? 'wait' : 'pointer',
                }}
              >
                {archiving ? 'ARCHIVAGE…' : 'ARCHIVER LE POINT SÉLECTIONNÉ'}
              </button>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      {lockers.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['CODE', 'POINT', 'TYPE', 'STATUT', 'CAPACITÉ', ''].map((heading) => (
                  <th
                    key={heading || 'link'}
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      borderBottom: borderSubtle(),
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lockers.map((locker) => (
                <tr key={locker.id}>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle(), fontWeight: 700 }}>
                    {locker.code}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle(), fontWeight: 600 }}>
                    {locker.name}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle(), fontSize: '0.8125rem' }}>
                    {locker.typeLabel}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle() }}>
                    {locker.statusLabel}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle() }}>
                    {usesCompartmentGrid(locker.type)
                      ? `${locker.availableSlots} / ${locker.compartmentCounts.total}`
                      : `${locker.availableSlots} / ${locker.maxCapacity ?? '—'}`}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle() }}>
                    <a href={`/tableau-de-bord/points/${locker.id}`} style={{ fontWeight: 600 }}>
                      DÉTAIL →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
