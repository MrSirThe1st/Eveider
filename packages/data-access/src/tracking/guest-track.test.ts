import { describe, expect, it } from 'vitest';
import {
  createGuestTrackToken,
  normalizeTrackPhone,
  phonesMatch,
  verifyGuestTrackToken,
} from './guest-track.js';

describe('guest track', () => {
  it('normalizes phones and matches variants', () => {
    expect(normalizeTrackPhone('+243 800 000 000')).toBe('243800000000');
    expect(phonesMatch('+243800000000', '243800000000')).toBe(true);
    expect(phonesMatch('0800000000', '243800000000')).toBe(true);
  });

  it('creates and verifies track tokens', () => {
    const token = createGuestTrackToken('parcel-1', '+243800000000');
    const payload = verifyGuestTrackToken(token);
    expect(payload?.parcelId).toBe('parcel-1');
    expect(payload?.phone).toBe('243800000000');
  });

  it('rejects tampered tokens', () => {
    const token = createGuestTrackToken('parcel-1', '+243800000000');
    expect(verifyGuestTrackToken(`${token}x`)).toBeNull();
  });
});
