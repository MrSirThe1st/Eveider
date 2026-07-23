import { describe, expect, it } from 'vitest';
import {
  buildCompartmentQrPayload,
  crockfordCheckSymbol,
  generatePickupPinCode,
  generatePointCode,
  generateTrackingNumber,
  isValidPointCode,
  isValidTrackingNumber,
  normalizeTrackingNumber,
} from './identifiers.js';

describe('identifiers', () => {
  it('generates valid tracking numbers with checksum', () => {
    const tracking = generateTrackingNumber(new Date('2026-07-23T00:00:00Z'));
    expect(tracking).toMatch(/^EVD26[0-9A-HJKMNP-TV-Z]{8}[0-9A-HJKMNP-TV-Z*~$=]$/);
    expect(isValidTrackingNumber(tracking)).toBe(true);
    expect(isValidTrackingNumber(tracking.slice(0, -1) + '0')).toBe(
      crockfordCheckSymbol(tracking.slice(0, -1)) === '0',
    );
  });

  it('normalizes ambiguous crockford characters', () => {
    const tracking = generateTrackingNumber();
    const mangled = tracking.toLowerCase().replace(/0/g, 'o');
    expect(normalizeTrackingNumber(mangled)).toBe(tracking);
    expect(isValidTrackingNumber(mangled)).toBe(true);
  });

  it('generates valid Eveider Point codes', () => {
    const code = generatePointCode();
    expect(code).toMatch(/^EVP[0-9A-HJKMNP-TV-Z]{6}[0-9A-HJKMNP-TV-Z*~$=]$/);
    expect(isValidPointCode(code)).toBe(true);
  });

  it('generates 6-digit pickup pins', () => {
    for (let i = 0; i < 20; i++) {
      const pin = generatePickupPinCode();
      expect(pin).toMatch(/^[1-9]\d{5}$/);
    }
  });

  it('builds compartment QR payloads', () => {
    expect(buildCompartmentQrPayload('evpa7k3m2x', 'b3')).toBe('EVPA7K3M2X/B3');
  });
});
