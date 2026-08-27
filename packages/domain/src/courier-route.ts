import { haversineDistanceKm } from './geo.js';

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type LockerStop = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

function toPoint(stop: LockerStop): GeoPoint | null {
  if (stop.latitude == null || stop.longitude == null) return null;
  return { latitude: stop.latitude, longitude: stop.longitude };
}

/**
 * Nearest-neighbour order of unique locker stops from `origin`.
 * Stops without coordinates keep their original relative order at the end.
 */
export function orderLockerStops<T extends LockerStop>(origin: GeoPoint, stops: T[]): T[] {
  const unique: T[] = [];
  const seen = new Set<string>();
  for (const stop of stops) {
    if (seen.has(stop.id)) continue;
    seen.add(stop.id);
    unique.push(stop);
  }

  const located: T[] = [];
  const missing: T[] = [];
  for (const stop of unique) {
    if (toPoint(stop)) located.push(stop);
    else missing.push(stop);
  }

  const ordered: T[] = [];
  let current: GeoPoint = origin;
  const remaining = [...located];

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i]!;
      const point = toPoint(candidate);
      if (!point) continue;
      const distance = haversineDistanceKm(current, point);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    const next = remaining.splice(nearestIndex, 1)[0]!;
    ordered.push(next);
    current = toPoint(next) ?? current;
  }

  return [...ordered, ...missing];
}
