import { describe, expect, it } from 'vitest';
import {
  buildIdentityDocumentObjectPath,
  sniffIdentityDocumentMime,
  validateIdentityDocumentFile,
} from './identity-documents.js';

function jpegBytes(length = 48): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

describe('sniffIdentityDocumentMime', () => {
  it('recognizes jpeg, png, webp and pdf magic bytes', () => {
    expect(sniffIdentityDocumentMime(jpegBytes())).toBe('image/jpeg');

    const png = new Uint8Array(32);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffIdentityDocumentMime(png)).toBe('image/png');

    const webp = new Uint8Array(32);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffIdentityDocumentMime(webp)).toBe('image/webp');

    const pdf = new Uint8Array(32);
    pdf.set([0x25, 0x50, 0x44, 0x46]);
    expect(sniffIdentityDocumentMime(pdf)).toBe('application/pdf');
  });

  it('rejects unknown bytes', () => {
    expect(sniffIdentityDocumentMime(new Uint8Array(32))).toBeNull();
  });
});

describe('validateIdentityDocumentFile', () => {
  it('accepts a jpeg and sanitizes the name', () => {
    const result = validateIdentityDocumentFile({
      bytes: jpegBytes(),
      fileName: 'Carte identite (recto).JPEG',
      declaredMimeType: 'image/jpeg',
    });
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('.jpg');
    expect(result.fileName).toBe('Carte-identite-recto.jpg');
  });

  it('rejects a mime/content mismatch', () => {
    expect(() =>
      validateIdentityDocumentFile({
        bytes: jpegBytes(),
        fileName: 'id.jpg',
        declaredMimeType: 'application/pdf',
      }),
    ).toThrow('Format non accepté');
  });

  it('rejects tiny or huge files', () => {
    expect(() =>
      validateIdentityDocumentFile({ bytes: jpegBytes(8), fileName: 'id.jpg' }),
    ).toThrow('Pièce d’identité requise');

    const huge = jpegBytes(5 * 1024 * 1024 + 1);
    expect(() => validateIdentityDocumentFile({ bytes: huge, fileName: 'id.jpg' })).toThrow(
      'Fichier trop volumineux',
    );
  });
});

describe('buildIdentityDocumentObjectPath', () => {
  it('scopes the object under kind and uploader', () => {
    expect(buildIdentityDocumentObjectPath('driver_id', 'admin-1', '.jpg', 'abc')).toBe(
      'driver_id/admin-1/abc.jpg',
    );
    expect(buildIdentityDocumentObjectPath('vehicle', 'admin-1', '.pdf', 'abc')).toBe(
      'vehicle/admin-1/abc.pdf',
    );
  });
});
