const REDACTED_KEYS = new Set([
  'pin',
  'pickuppin',
  'pickup_pin',
  'returncode',
  'return_code',
  'token',
  'authorization',
  'pinhash',
  'pin_hash',
  'bearer',
  'plaintext',
  'secret',
]);

function shouldRedact(key: string): boolean {
  const lower = key.toLowerCase();
  if (REDACTED_KEYS.has(lower) || REDACTED_KEYS.has(lower.replace(/-/g, '_'))) return true;
  return (
    lower.includes('pin') ||
    lower.includes('token') ||
    lower.includes('secret') ||
    lower.includes('returncode') ||
    lower.includes('return_code') ||
    lower.includes('authorization') ||
    lower.includes('bearer')
  );
}

export function logLockerEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (shouldRedact(key)) continue;
    if (key.toLowerCase().includes('phone') && typeof value === 'string' && value.length > 4) {
      safe[key] = `…${value.slice(-4)}`;
      continue;
    }
    safe[key] = value;
  }
  console.info(`[eveider:locker] ${event}`, safe);
}
