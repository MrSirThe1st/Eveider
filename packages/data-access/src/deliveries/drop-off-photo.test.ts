import { describe, expect, it } from 'vitest';
import { normalizeDropOffPhoto } from './drop-off-photo.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 40 }, () => 0x00)]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...Array.from({ length: 40 }, () => 0x00)]);

describe('normalizeDropOffPhoto', () => {
  it('accepts a JPEG data URL', () => {
    const encoded = jpeg.toString('base64');
    expect(normalizeDropOffPhoto(`data:image/jpeg;base64,${encoded}`)).toBe(
      `data:image/jpeg;base64,${encoded}`,
    );
  });

  it('accepts raw PNG base64', () => {
    const encoded = png.toString('base64');
    expect(normalizeDropOffPhoto(encoded)).toBe(`data:image/png;base64,${encoded}`);
  });

  it('rejects missing photos', () => {
    expect(() => normalizeDropOffPhoto('   ')).toThrow('requise');
  });

  it('rejects non-image payloads', () => {
    expect(() => normalizeDropOffPhoto(Buffer.alloc(40, 0x41).toString('base64'))).toThrow(
      'JPEG ou PNG',
    );
  });
});
