import { describe, expect, it } from 'vitest';
import { isZonePriceConfigured } from './service-area.js';

describe('isZonePriceConfigured', () => {
  it('treats explicit 0 as configured', () => {
    expect(isZonePriceConfigured(0)).toBe(true);
  });

  it('treats a positive amount as configured', () => {
    expect(isZonePriceConfigured(1500)).toBe(true);
  });

  it('treats null and undefined as unconfigured', () => {
    expect(isZonePriceConfigured(null)).toBe(false);
    expect(isZonePriceConfigured(undefined)).toBe(false);
  });
});
