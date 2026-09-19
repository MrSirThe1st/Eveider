const REDACTED_KEYS = new Set([
  'pin',
  'pickupPin',
  'returnCode',
  'token',
  'authorization',
  'pinHash',
]);

export function logLockerEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACTED_KEYS.has(key)) continue;
    if (key.toLowerCase().includes('phone') && typeof value === 'string' && value.length > 4) {
      safe[key] = `…${value.slice(-4)}`;
      continue;
    }
    safe[key] = value;
  }
  console.info(`[eveider:locker] ${event}`, safe);
}
