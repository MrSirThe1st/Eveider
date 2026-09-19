import { describe, expect, it } from 'vitest';
import { hashLockerCollectionPin, lockerPinHashMatches } from './pin-hash.js';

describe('locker collection PIN hash', () => {
  it('hashes trimmed PIN as sha256 hex and compares in constant time', () => {
    const hash = hashLockerCollectionPin(' 482913 ');
    expect(hash).toHaveLength(64);
    expect(lockerPinHashMatches('482913', hash)).toBe(true);
    expect(lockerPinHashMatches('000000', hash)).toBe(false);
  });
});
