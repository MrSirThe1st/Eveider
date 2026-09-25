'use client';

import { LoadingSpinner } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AddressMapPicker,
  type AddressMapValue,
} from '@/components/address-map-picker';
import { FlashBanner } from '@/components/flash-banner';
import { LockerCreatePanel, type CreatePointPayload } from '@/components/locker-create-panel';
import type { CityOptionDto } from '@/lib/city-presenter';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';

type LockerCreatePageProps = {
  cities: CityOptionDto[];
  serviceAreas: ServiceAreaOptionDto[];
};

export function LockerCreatePage({ cities, serviceAreas }: LockerCreatePageProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressValue, setAddressValue] = useState<AddressMapValue>({
    street: '',
    lat: null,
    lng: null,
  });

  function onAddressChange(next: AddressMapValue) {
    setAddressValue(next);
    setError(null);
  }

  async function createLocker(input: CreatePointPayload) {
    if (addressValue.lat == null || addressValue.lng == null) {
      setError('Placez un repère sur la carte pour confirmer l’emplacement exact.');
      return;
    }
    if (!addressValue.street.trim()) {
      setError('Recherchez et sélectionnez une adresse.');
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
          address: addressValue.street.trim(),
          latitude: addressValue.lat,
          longitude: addressValue.lng,
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

  const placementConfirmed = addressValue.lat != null && addressValue.lng != null;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {error ? <FlashBanner message={error} variant="error" /> : null}
      {saving ? <LoadingSpinner label="Création du casier…" /> : null}

      <AddressMapPicker
        value={addressValue}
        onChange={onAddressChange}
        onSearchError={setError}
        label="Adresse du casier"
        placeholder="Rechercher une adresse ou un lieu…"
        mapTitle="Position exacte"
        mapHint="Sélectionnez une suggestion ou cliquez sur la carte pour placer le repère. Déplacez-le si besoin."
        mapHeight={420}
      />

      <LockerCreatePanel
        address={addressValue.street}
        onAddressChange={(street) =>
          onAddressChange({ street, lat: addressValue.lat, lng: addressValue.lng })
        }
        addressReadOnly
        placementConfirmed={placementConfirmed}
        latitude={addressValue.lat}
        longitude={addressValue.lng}
        saving={saving}
        cities={cities}
        serviceAreas={serviceAreas}
        onCreate={(input) => void createLocker(input)}
      />
    </div>
  );
}
