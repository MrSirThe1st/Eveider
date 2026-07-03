/** Kinshasa center — fallback when geolocation is unavailable. */
export const KINSHASA_CENTER = {
  latitude: -4.3217,
  longitude: 15.3125,
} as const;

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function buildCompartmentLabels(rows: number, columns: number): string[] {
  const labels: string[] = [];
  for (let row = 0; row < rows; row++) {
    const rowLetter = String.fromCharCode(65 + row);
    for (let col = 1; col <= columns; col++) {
      labels.push(`${rowLetter}${col}`);
    }
  }
  return labels;
}

export function sortByDistance<T extends { latitude: number; longitude: number }>(
  origin: { latitude: number; longitude: number },
  items: T[],
): Array<T & { distanceKm: number }> {
  return items
    .map((item) => ({
      ...item,
      distanceKm: haversineDistanceKm(origin, item),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
