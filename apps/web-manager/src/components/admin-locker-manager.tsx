'use client';

import { colors, radius, borderSubtle, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import type { CompartmentCell } from '@eveider/domain';
import { LoadingSpinner } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { LockerCreatePanel } from '@/components/locker-create-panel';
import { LockerMapbox } from '@/components/locker-mapbox';
import type { LockerMapMarkerDto, LockerSummaryDto } from '@/lib/locker-presenter';
import { searchMapboxPlaces, zoomForPlaceType, type MapboxPlace, type MapSearchViewport } from '@/lib/mapbox';

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
  const [searchResults, setSearchResults] = useState<MapboxPlace[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
  const [mapViewport, setMapViewport] = useState<MapSearchViewport | null>(null);

  const mapMarkers = useMemo<LockerMapMarkerDto[]>(() => {
    return lockers
      .filter((locker) => locker.latitude != null && locker.longitude != null)
      .map((locker) => ({
        id: locker.id,
        name: locker.name,
        address: locker.address,
        latitude: locker.latitude!,
        longitude: locker.longitude!,
        status: locker.status,
        statusLabel: locker.statusLabel,
        availableCompartments: locker.compartmentCounts.available,
        rows: locker.rows,
        columns: locker.columns,
      }));
  }, [lockers]);

  function panMapTo(latitude: number, longitude: number, zoom = 15) {
    setMapFocus({ latitude, longitude, zoom, key: Date.now() });
  }

  function setPlacement(coords: { latitude: number; longitude: number }, confirmed = true) {
    setDraft(coords);
    setPlacementConfirmed(confirmed);
    setSelectedLockerId('');
  }

  async function handleLocationSearch(event?: React.FormEvent) {
    event?.preventDefault();
    if (locationSearch.trim().length < 2) {
      setError('Saisissez au moins 2 caractères.');
      return;
    }

    setSearching(true);
    setError(null);
    setSearchResults([]);
    setSelectedResultId(null);
    setDraft(null);
    setPlacementConfirmed(false);

    try {
      const places = await searchMapboxPlaces(locationSearch, {
        limit: 8,
        viewport: mapViewport ?? undefined,
      });

      if (places.length === 0) {
        setError('Aucun résultat. Essayez un autre libellé.');
        return;
      }

      setSearchResults(places);
    } catch {
      setError('Recherche impossible. Vérifiez votre jeton Mapbox.');
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(place: MapboxPlace) {
    setSelectedResultId(place.id);
    setError(null);
    if (!address.trim()) {
      setAddress(place.label);
    }
    panMapTo(place.latitude, place.longitude, zoomForPlaceType(place.placeType));
    setPlacement(
      { latitude: place.latitude, longitude: place.longitude },
      false,
    );
  }

  function handleMapPlacement(coords: { latitude: number; longitude: number }) {
    setPlacement(coords, true);
  }

  async function createLocker(input: {
    code?: string;
    name: string;
    address: string;
    rows: number;
    columns: number;
    compartments: CompartmentCell[];
    status: 'active' | 'offline';
  }) {
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

      setSuccess(`Casier ${input.name} créé (${result.data.locker.code}).`);
      setDraft(null);
      setPlacementConfirmed(false);
      setAddress('');
      setLocationSearch('');
      setSearchResults([]);
      setSelectedResultId(null);
      setMapFocus(null);
      router.refresh();
    } catch {
      setError('Impossible de créer le casier.');
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

      setSuccess('Casier archivé.');
      setSelectedLockerId('');
      router.refresh();
    } catch {
      setError('Impossible d’archiver le casier.');
    } finally {
      setArchiving(false);
    }
  }

  const placementHint = !draft
    ? 'Zoomez sur la zone visée, puis recherchez. Si la rue n’apparaît pas, cliquez directement sur la carte pour placer le repère.'
    : !placementConfirmed
      ? 'Repère placé — glissez-le ou cliquez sur la carte pour confirmer l’emplacement exact.'
      : `Emplacement confirmé : ${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}`;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {error ? <FlashBanner message={error} variant="error" /> : null}
      {success ? <FlashBanner message={success} /> : null}
      {(saving || archiving) ? (
        <LoadingSpinner
          label={saving ? 'Création du casier…' : 'Archivage…'}
          minHeight="4rem"
          size={28}
        />
      ) : null}

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ width: '100%' }}>
          <LockerMapbox
            lockers={mapMarkers}
            selectedLockerId={selectedLockerId}
            onSelectLocker={setSelectedLockerId}
            draftMarker={draft}
            draftMarkerDraggable={Boolean(draft)}
            onDraftMarkerDrag={handleMapPlacement}
            mapFocus={mapFocus}
            onViewportChange={setMapViewport}
            onMapClick={handleMapPlacement}
            height={580}
          />
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', fontWeight: 600, color: colors.secondary }}>
            {placementHint}
          </p>
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
                Les résultats sont priorisés autour de la zone affichée sur la carte. Certaines rues visibles sur la carte ne sont pas indexées par la recherche.
              </p>

              <form onSubmit={(event) => void handleLocationSearch(event)} style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>RECHERCHER UN LIEU</span>
                  <input
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder="Avenue, bâtiment, quartier, ville…"
                    style={inputStyle}
                  />
                </label>
                <button
                  type="submit"
                  disabled={searching || locationSearch.trim().length < 2}
                  style={{
                    ...webSecondaryButtonStyle,
                    width: '100%',
                    height: 38,
                    background: colors.surface,
                    cursor: searching ? 'wait' : 'pointer',
                    opacity: locationSearch.trim().length >= 2 ? 1 : 0.6,
                  }}
                >
                  {searching ? 'RECHERCHE…' : 'RECHERCHER'}
                </button>
              </form>

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
                {archiving ? 'ARCHIVAGE…' : 'ARCHIVER LE CASIER SÉLECTIONNÉ'}
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
                {['CODE', 'CASIER', 'STATUT', 'GRILLE', 'DISPONIBLES', ''].map((heading) => (
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
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle() }}>
                    {locker.statusLabel}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle() }}>
                    {locker.rows}×{locker.columns}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle() }}>
                    {locker.compartmentCounts.available} / {locker.compartmentCounts.total}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: borderSubtle() }}>
                    <a href={`/tableau-de-bord/casiers/${locker.id}`} style={{ fontWeight: 600 }}>
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
