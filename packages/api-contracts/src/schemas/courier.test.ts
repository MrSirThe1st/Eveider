import { describe, expect, it } from 'vitest';
import { createCourierDossierSchema } from './courier.js';

describe('createCourierDossierSchema', () => {
  const base = {
    fullName: 'Jean Coursier',
    email: 'jean@eveider.cd',
  };

  it('accepts an uploaded storage key', () => {
    const parsed = createCourierDossierSchema.safeParse({
      ...base,
      idDocumentUrl: 'eveider://identity-documents/driver_id/admin-1/abc.jpg',
    });
    expect(parsed.success).toBe(true);
  });

  it('still accepts an https URL for existing dossiers', () => {
    const parsed = createCourierDossierSchema.safeParse({
      ...base,
      idDocumentUrl: 'https://files.example/id.jpg',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a pasted non-https path', () => {
    const parsed = createCourierDossierSchema.safeParse({
      ...base,
      idDocumentUrl: 'ftp://files.example/id.jpg',
    });
    expect(parsed.success).toBe(false);
  });
});
