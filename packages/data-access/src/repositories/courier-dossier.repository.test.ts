import { describe, expect, it } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { CourierDossierRepository } from './courier-dossier.repository.js';

function dossierRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-08-23T12:00:00.000Z');
  return {
    id: 'dossier-1',
    contractor_type: 'eveider',
    business_id: null,
    user_id: null,
    full_name: 'Jean Coursier',
    email: 'jean@eveider.cd',
    phone: '+243820000000',
    id_document_url: 'https://files.example/id.jpg',
    notes: null,
    review_notes: null,
    status: 'pending_review',
    created_by_user_id: 'admin-1',
    reviewed_by_user_id: null,
    reviewed_at: null,
    invited_at: null,
    deactivated_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('CourierDossierRepository', () => {
  it('refuses a second open dossier for the same email', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'status <> \'rejected\'')) {
        return dossierRow();
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    await expect(
      repo.create(ctx, {
        contractorType: 'eveider',
        fullName: 'Jean',
        email: 'jean@eveider.cd',
        idDocumentUrl: 'https://files.example/id.jpg',
      }),
    ).rejects.toThrow('existe déjà');
  });
});
