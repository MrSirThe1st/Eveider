import { describe, expect, it } from 'vitest';
import {
  buildStoredDocumentRef,
  documentViewPath,
  driverVehicleDocumentIdSchema,
  identityDocumentFileName,
  isImageDocumentPath,
  MAX_DRIVER_VEHICLE_DOCUMENTS,
  parseStoredDocumentRef,
  storedDocumentRefSchema,
} from './documents.js';

describe('stored document refs', () => {
  it('builds and parses a private storage key', () => {
    const stored = buildStoredDocumentRef('driver_id/admin-1/abc.jpg');
    expect(stored).toBe('eveider://identity-documents/driver_id/admin-1/abc.jpg');
    expect(parseStoredDocumentRef(stored)).toEqual({
      bucket: 'identity-documents',
      objectPath: 'driver_id/admin-1/abc.jpg',
    });
  });

  it('rejects path traversal', () => {
    expect(parseStoredDocumentRef('eveider://identity-documents/../secret.jpg')).toBeNull();
  });

  it('maps stored refs to the authenticated viewer path', () => {
    expect(documentViewPath('eveider://identity-documents/driver_id/a/b.jpg')).toBe(
      '/api/documents/driver_id/a/b.jpg',
    );
    expect(documentViewPath('https://files.example/id.jpg')).toBe('https://files.example/id.jpg');
  });

  it('accepts stored refs and https URLs on the contract', () => {
    expect(storedDocumentRefSchema.safeParse('eveider://identity-documents/driver_id/a.jpg').success).toBe(
      true,
    );
    expect(storedDocumentRefSchema.safeParse('https://files.example/id.jpg').success).toBe(true);
    expect(storedDocumentRefSchema.safeParse('http://insecure.example/id.jpg').success).toBe(false);
    expect(storedDocumentRefSchema.safeParse('/local/id.jpg').success).toBe(false);
  });

  it('detects image paths', () => {
    expect(isImageDocumentPath('eveider://identity-documents/driver_id/a.jpg')).toBe(true);
    expect(isImageDocumentPath('eveider://identity-documents/driver_id/a.pdf')).toBe(false);
    expect(isImageDocumentPath('key', 'carte.png')).toBe(true);
  });

  it('builds a downloadable file name from the owner and stored path', () => {
    expect(
      identityDocumentFileName(
        'eveider://identity-documents/driver_id/admin-1/abc.jpg',
        'Jean-Pierre Tshibanda',
      ),
    ).toBe('piece-identite-jean-pierre-tshibanda.jpg');
    expect(identityDocumentFileName('https://files.example/id.PDF', 'Émile')).toBe(
      'piece-identite-emile.pdf',
    );
  });

  it('caps optional vehicle files and validates their ids', () => {
    expect(MAX_DRIVER_VEHICLE_DOCUMENTS).toBe(8);
    expect(driverVehicleDocumentIdSchema.safeParse('e5b9c1b9-cc88-4c71-ac72-73394ef29eac').success).toBe(
      true,
    );
    expect(driverVehicleDocumentIdSchema.safeParse('not-a-uuid').success).toBe(false);
  });
});
