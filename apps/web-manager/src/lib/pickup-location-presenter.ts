import type { BusinessLocation } from '@eveider/data-access';
import { normalizeFormattedAddress } from '@/lib/google-maps';

export type PickupLocationDto = {
  id: string;
  name: string;
  street: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  contactPerson: string | null;
  contactPhone: string | null;
  instructions: string | null;
  isDefault: boolean;
};

export function toPickupLocationDto(location: BusinessLocation): PickupLocationDto {
  return {
    id: location.id,
    name: location.name?.trim() || 'Adresse de collecte',
    street: normalizeFormattedAddress(location.street),
    city: location.city,
    country: location.country,
    lat: location.lat,
    lng: location.lng,
    contactPerson: location.contactPerson,
    contactPhone: location.contactPhone,
    instructions: location.instructions,
    isDefault: location.isDefault,
  };
}
