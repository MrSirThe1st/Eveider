'use client';

import { colors, borderSubtle, radius, webInputStyle } from '@eveider/config-ui';
import { Button, InlineAlert, Modal, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LockerGoogleMap } from '@/components/locker-google-map';
import { SettingsFormSection } from '@/components/ops-ui';
import type { PickupLocationDto } from '@/lib/pickup-location-presenter';
import {
  reverseGeocodeGoogle,
  searchGooglePlaces,
  zoomForPlaceType,
  type MapPlace,
  type MapSearchViewport,
} from '@/lib/google-maps';

type PickupLocationsSectionProps = {
  locations: PickupLocationDto[];
  defaultCountry?: string;
  defaultCity?: string;
};

type EditorState = {
  id: string | null;
  name: string;
  street: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
};

const emptyEditor = (): EditorState => ({
  id: null,
  name: '',
  street: '',
  lat: null,
  lng: null,
  isDefault: false,
});

export function PickupLocationsSection({
  locations: initialLocations,
  defaultCountry = 'RDC',
  defaultCity = 'Kinshasa',
}: PickupLocationsSectionProps) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapViewport, setMapViewport] = useState<MapSearchViewport | null>(null);
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    key: number;
  } | null>(null);
  const searchRequestId = useRef(0);
  /** After picking a suggestion, ignore search until the user types again. */
  const suppressSearchRef = useRef(false);

  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  useEffect(() => {
    if (!open) return;
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
          setError('Recherche impossible. Vérifiez votre clé Google Maps.');
        } finally {
          if (requestId === searchRequestId.current) setSearching(false);
        }
      })();
    }, 320);

    return () => window.clearTimeout(timer);
  }, [addressQuery, mapViewport, open]);

  function resetAddressUi(nextQuery = '', suppress = Boolean(nextQuery)) {
    suppressSearchRef.current = suppress;
    searchRequestId.current += 1;
    setAddressQuery(nextQuery);
    setSearchResults([]);
    setSearching(false);
  }

  function openCreate() {
    setError(null);
    setEditor({ ...emptyEditor(), isDefault: locations.length === 0 });
    resetAddressUi('', false);
    setMapFocus(null);
    setOpen(true);
  }

  function openEdit(location: PickupLocationDto) {
    setError(null);
    setEditor({
      id: location.id,
      name: location.name,
      street: location.street,
      lat: location.lat,
      lng: location.lng,
      isDefault: location.isDefault,
    });
    resetAddressUi(location.street, true);
    if (location.lat != null && location.lng != null) {
      setMapFocus({
        latitude: location.lat,
        longitude: location.lng,
        zoom: 16,
        key: Date.now(),
      });
    } else {
      setMapFocus(null);
    }
    setOpen(true);
  }

  function selectSearchResult(place: MapPlace) {
    suppressSearchRef.current = true;
    searchRequestId.current += 1;
    setSearchResults([]);
    setSearching(false);
    setAddressQuery(place.label);
    setEditor((current) => ({
      ...current,
      street: place.label,
      lat: place.latitude,
      lng: place.longitude,
    }));
    setMapFocus({
      latitude: place.latitude,
      longitude: place.longitude,
      zoom: zoomForPlaceType(place.placeType),
      key: Date.now(),
    });
    setError(null);
  }

  function onAddressInputChange(value: string) {
    suppressSearchRef.current = false;
    setAddressQuery(value);
    setEditor((current) => ({
      ...current,
      street: value,
      // Clear pin until a new suggestion is chosen or the map is clicked.
      lat: null,
      lng: null,
    }));
    setMapFocus(null);
  }

  async function handleMapPlacement(coords: { latitude: number; longitude: number }) {
    setEditor((current) => ({
      ...current,
      lat: coords.latitude,
      lng: coords.longitude,
    }));
    setMapFocus({
      latitude: coords.latitude,
      longitude: coords.longitude,
      zoom: 17,
      key: Date.now(),
    });

    // Keep the chosen address when refining the pin; only fill address if empty.
    if (editor.street.trim()) {
      setError(null);
      return;
    }

    try {
      const resolved = await reverseGeocodeGoogle(coords.latitude, coords.longitude);
      if (resolved) {
        suppressSearchRef.current = true;
        setAddressQuery(resolved);
        setEditor((current) => ({
          ...current,
          street: resolved,
          lat: coords.latitude,
          lng: coords.longitude,
        }));
      }
    } catch {
      /* keep pin without address */
    }
    setError(null);
  }

  async function handleSave() {
    setError(null);
    if (!editor.name.trim() || editor.name.trim().length < 2) {
      setError('Indiquez un nom de lieu.');
      return;
    }
    if (!editor.street.trim() || editor.street.trim().length < 5) {
      setError('Recherchez et sélectionnez une adresse de collecte.');
      return;
    }
    if (editor.lat == null || editor.lng == null) {
      setError('Sélectionnez une adresse ou placez un repère sur la carte.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editor.name.trim(),
        street: editor.street.trim(),
        city: defaultCity,
        country: defaultCountry,
        lat: editor.lat,
        lng: editor.lng,
        isDefault: editor.isDefault || undefined,
      };

      const response = await fetch(
        editor.id
          ? `/api/organisation/pickup-locations/${editor.id}`
          : '/api/organisation/pickup-locations',
        {
          method: editor.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Enregistrement impossible');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(location: PickupLocationDto) {
    if (!window.confirm(`Supprimer « ${location.name} » ?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/organisation/pickup-locations/${location.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Suppression impossible');
        return;
      }
      router.refresh();
    } catch {
      setError('Suppression impossible.');
    }
  }

  async function handleSetDefault(location: PickupLocationDto) {
    setError(null);
    try {
      const response = await fetch(`/api/organisation/pickup-locations/${location.id}/default`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Impossible de définir le défaut');
        return;
      }
      router.refresh();
    } catch {
      setError('Impossible de définir le défaut.');
    }
  }

  const draft =
    editor.lat != null && editor.lng != null
      ? { latitude: editor.lat, longitude: editor.lng }
      : null;

  return (
    <>
      <SettingsFormSection
        title="Adresses de collecte"
        description="Les lieux où Eveider peut récupérer vos colis."
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <Button type="button" size="sm" variant="secondary" onClick={openCreate}>
            + Ajouter une adresse
          </Button>
        </div>

        {error && !open ? <InlineAlert message={error} variant="error" /> : null}

        {locations.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: colors.textMuted }}>
            Aucune adresse de collecte enregistrée. Ajoutez un lieu pour les collectes Eveider.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {locations.map((location, index) => (
              <div
                key={location.id}
                style={{
                  display: 'grid',
                  gap: '0.35rem',
                  padding: '1rem 0',
                  borderTop: index === 0 ? 'none' : borderSubtle(),
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9375rem' }}>{location.name}</strong>
                      {location.isDefault ? (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            color: colors.primary,
                            background: colors.primaryMuted,
                            padding: '0.15rem 0.45rem',
                            borderRadius: radius.button,
                          }}
                        >
                          PAR DÉFAUT
                        </span>
                      ) : null}
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: colors.textMuted }}>
                      {location.street}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    {!location.isDefault ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleSetDefault(location)}
                      >
                        Défaut
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(location)}>
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDelete(location)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsFormSection>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editor.id ? 'Modifier l’adresse de collecte' : 'Ajouter une adresse de collecte'}
        description="Donnez un nom au lieu, recherchez l’adresse, puis ajustez le pin si besoin."
        maxWidth={720}
        maxHeight="min(92vh, 820px)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={() => void handleSave()} loading={saving} disabled={saving}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: '1.15rem' }}>
          {error ? <InlineAlert message={error} variant="error" /> : null}

          <TextField
            label="Nom du lieu"
            value={editor.name}
            onChange={(e) => setEditor((c) => ({ ...c, name: e.target.value }))}
            placeholder="Ex. Entrepôt principal"
            required
          />

          <label className="ops-reuse-check">
            <input
              type="checkbox"
              checked={editor.isDefault}
              onChange={(e) => setEditor((c) => ({ ...c, isDefault: e.target.checked }))}
            />
            Définir comme adresse par défaut
          </label>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="ops-field-label">Adresse de collecte</span>
              <input
                value={addressQuery}
                onChange={(e) => onAddressInputChange(e.target.value)}
                placeholder="Rechercher une adresse ou un lieu…"
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
                Position exacte
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
                Déplacez le repère si nécessaire pour indiquer précisément où le chauffeur doit se
                rendre.
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
              height={340}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
