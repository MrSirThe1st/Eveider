export function uniqueGeoCode(prefix: string) {
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}${suffix}`.slice(0, 12);
}
