'use client';

import { colors, borderSubtle, radius } from '@eveider/config-ui';
import { Button, InlineAlert, Modal, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AddressMapPicker,
  type AddressMapValue,
} from '@/components/address-map-picker';
import { SettingsFormSection } from '@/components/ops-ui';
import type { PickupLocationDto } from '@/lib/pickup-location-presenter';
import { normalizeFormattedAddress } from '@/lib/google-maps';

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
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  function openCreate() {
    setError(null);
    setEditor({ ...emptyEditor(), isDefault: locations.length === 0 });
    setPickerKey(Date.now());
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
    setPickerKey(Date.now());
    setOpen(true);
  }

  function onAddressChange(next: AddressMapValue) {
    setEditor((current) => ({
      ...current,
      street: next.street,
      lat: next.lat,
      lng: next.lng,
    }));
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
        street: normalizeFormattedAddress(editor.street.trim()),
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

          <AddressMapPicker
            key={pickerKey}
            resetKey={pickerKey}
            active={open}
            value={{ street: editor.street, lat: editor.lat, lng: editor.lng }}
            onChange={onAddressChange}
            onSearchError={setError}
            label="Adresse de collecte"
            mapHint="Déplacez le repère si nécessaire pour indiquer précisément où le chauffeur doit se rendre."
            mapHeight={340}
          />
        </div>
      </Modal>
    </>
  );
}
