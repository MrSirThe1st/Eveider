import { haversineDistanceKm } from '@eveider/domain';
import type { Queryable } from '../db/index.js';

export type PickupCoordinates = {
  latitude: number;
  longitude: number;
  source: 'pickup_point' | 'business_address' | 'fallback';
};

/** Resolve pickup coordinates from business locations for distance-based pricing. */
export async function resolveBusinessPickupCoordinates(
  db: Queryable,
  businessId: string,
  senderAddress?: string | null,
): Promise<PickupCoordinates | null> {
  const normalizedAddress = senderAddress?.trim().toLowerCase() ?? '';

  const locations = await db.query(
    `SELECT type, street, lat, lng
     FROM business_locations
     WHERE business_id = $1
       AND lat IS NOT NULL
       AND lng IS NOT NULL
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
        source: type === 'pickup_point' ? 'pickup_point' : 'business_address',
      };
    }
  }

  const first = locations.rows[0];
  if (first?.lat != null && first?.lng != null) {
    const type = String(first.type);
    return {
      latitude: Number(first.lat),
      longitude: Number(first.lng),
      source: type === 'pickup_point' ? 'pickup_point' : 'business_address',
    };
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
