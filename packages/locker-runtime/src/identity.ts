import { createHash, timingSafeEqual } from 'node:crypto';
import { normalizeLockerPin } from '@eveider/domain';

export function hashLocalCollectionPin(pin: string): string {
  return createHash('sha256').update(normalizeLockerPin(pin), 'utf8').digest('hex');
}

export function localPinMatches(pin: string, pinHash: string): boolean {
  const actual = Buffer.from(hashLocalCollectionPin(pin), 'hex');
  const expected = Buffer.from(pinHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function phonesMatchLocal(a: string, b: string): boolean {
  const na = a.replace(/\D/g, '');
  const nb = b.replace(/\D/g, '');
  if (!na || !nb) return false;
  if (na === nb || na.endsWith(nb) || nb.endsWith(na)) return true;
  const ta = na.replace(/^0+/, '').slice(-9);
  const tb = nb.replace(/^0+/, '').slice(-9);
  return ta.length >= 8 && ta === tb;
}
