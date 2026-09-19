import { createHash, timingSafeEqual } from 'node:crypto';
import { normalizeLockerPin } from '@eveider/domain';

/** SHA-256 hex of the trimmed PIN. Plaintext stays in pickup_pins only. */
export function hashLockerCollectionPin(pin: string): string {
  return createHash('sha256').update(normalizeLockerPin(pin), 'utf8').digest('hex');
}

export function lockerPinHashMatches(pin: string, pinHash: string): boolean {
  const actual = Buffer.from(hashLockerCollectionPin(pin), 'hex');
  const expected = Buffer.from(pinHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
