import { haversineDistanceKm } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { formatLocationQuery, geocodeAddressQuery } from './geocode-address.js';

export type PickupCoordinates = {
  latitude: number;
  longitude: number;
  source: 'pickup_point' | 'business_address' | 'fallback';
};

function mapLocationSource(type: string): PickupCoordinates['source'] {
  return type === 'pickup_point' ? 'pickup_point' : 'business_address';
}

/** Resolve pickup coordinates from business locations for distance-based pricing. */
export async function resolveBusinessPickupCoordinates(
  db: Queryable,
  businessId: string,
  senderAddress?: string | null,
): Promise<PickupCoordinates | null> {
  const normalizedAddress = senderAddress?.trim().toLowerCase() ?? '';

  const locations = await db.query(
    `SELECT type, street, city, country, lat, lng
     FROM business_locations
     WHERE business_id = $1
     ORDER BY
       CASE type
         WHEN 'pickup_point' THEN 0
         WHEN 'business_address' THEN 1
         ELSE 2
       END,
       created_at ASC`,
    [businessId],
  );

  for (const row of locations.rows) {
    const street = row.street == null ? '' : String(row.street);
    const type = String(row.type);
    if (
      normalizedAddress &&
      street.trim().toLowerCase() === normalizedAddress &&
      row.lat != null &&
      row.lng != null
    ) {
      return {
        latitude: Number(row.lat),
        longitude: Number(row.lng),
        source: mapLocationSource(type),
      };
    }
  }

  for (const row of locations.rows) {
    if (row.lat == null || row.lng == null) continue;
    const type = String(row.type);
    return {
      latitude: Number(row.lat),
      longitude: Number(row.lng),
      source: mapLocationSource(type),
    };
  }

  if (normalizedAddress) {
    const geocoded = await geocodeAddressQuery(normalizedAddress);
    if (geocoded) {
      return { ...geocoded, source: 'fallback' };
    }
  }

  for (const row of locations.rows) {
    const query = formatLocationQuery({
      street: row.street == null ? null : String(row.street),
      city: row.city == null ? null : String(row.city),
      country: row.country == null ? null : String(row.country),
    });
    if (!query) continue;

    const geocoded = await geocodeAddressQuery(query);
    if (geocoded) {
      return { ...geocoded, source: 'fallback' };
    }
  }

  return null;
}

export function distanceKmToLocker(
  pickup: PickupCoordinates,
  locker: { latitude: number | null; longitude: number | null },
): number | null {
  if (locker.latitude == null || locker.longitude == null) return null;
  return haversineDistanceKm(
    { latitude: pickup.latitude, longitude: pickup.longitude },
    { latitude: locker.latitude, longitude: locker.longitude },
  );
}
