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
    service_area_id: null,
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

  it('loads the business driver roster snapshot', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM driver_dossiers d') && sqlIncludes(sql, 'LEFT JOIN LATERAL')) {
        return {
          id: 'dossier-1',
          user_id: 'user-1',
          full_name: 'Jean-Pierre Tshibanda',
          email: 'courier.lubum1@eveider.cd',
          phone: '+243820100001',
          status: 'active',
          id_document_url: 'https://files.eveider.cd/id/lubum1.jpg',
          notes: null,
          review_notes: null,
          invited_at: new Date('2026-08-01T12:00:00.000Z'),
          created_at: new Date('2026-08-01T12:00:00.000Z'),
          contractor_type: 'business',
          business_id: 'biz-1',
          business_name: 'Boutique Lubum',
          service_area_id: 'area-lsh',
          service_area_name: 'Lubumbashi',
          service_area_code: 'LSH',
          is_blocked: false,
          deactivated_at: null,
          current_tracking_number: 'EV12345',
          current_locker_name: 'Kenya',
          deliveries_today: 8,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('business', {
      userId: 'owner-1',
      businessId: 'biz-1',
      businessUserRole: 'admin',
    });

    const rows = await repo.listRosterForBusiness(ctx);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.currentTrackingNumber).toBe('EV12345');
    expect(rows[0]?.deliveriesToday).toBe(8);
    expect(rows[0]?.organizationName).toBe('Boutique Lubum');
    expect(rows[0]?.serviceAreaName).toBe('Lubumbashi');
  });

  it('loads the admin driver roster snapshot across organizations', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM driver_dossiers d') && sqlIncludes(sql, 'LEFT JOIN LATERAL')) {
        return {
          id: 'dossier-1',
          user_id: 'user-1',
          full_name: 'Jean-Pierre Tshibanda',
          email: 'courier.lubum1@eveider.cd',
          phone: '+243820100001',
          status: 'active',
          id_document_url: 'https://files.eveider.cd/id/lubum1.jpg',
          notes: null,
          review_notes: null,
          invited_at: new Date('2026-08-01T12:00:00.000Z'),
          created_at: new Date('2026-08-01T12:00:00.000Z'),
          contractor_type: 'eveider',
          business_id: null,
          business_name: null,
          service_area_id: 'area-lsh',
          service_area_name: 'Lubumbashi',
          service_area_code: 'LSH',
          is_blocked: false,
          deactivated_at: null,
          current_tracking_number: 'EV12345',
          current_locker_name: 'Kenya',
          deliveries_today: 8,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    const rows = await repo.listRosterForAdmin(ctx);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.contractorType).toBe('eveider');
    expect(rows[0]?.organizationName).toBeNull();
    expect(rows[0]?.currentTrackingNumber).toBe('EV12345');
    expect(rows[0]?.serviceAreaCode).toBe('LSH');
  });

  it('creates Eveider dossiers as approved so they can be invited immediately', async () => {
    let insertStatus: unknown;
    const db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, "status <> 'rejected'")) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO driver_dossiers')) {
        insertStatus = values?.[9];
        return dossierRow({ status: 'approved' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    const created = await repo.create(ctx, {
      contractorType: 'eveider',
      fullName: 'Jean',
      email: 'jean2@eveider.cd',
      idDocumentUrl: 'https://files.example/id.jpg',
    });
    expect(insertStatus).toBe('approved');
    expect(created.status).toBe('approved');
  });

  it('creates business dossiers as pending_review until Eveider approves', async () => {
    let insertStatus: unknown;
    const db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, "status <> 'rejected'")) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO driver_dossiers')) {
        insertStatus = values?.[9];
        return dossierRow({
          contractor_type: 'business',
          business_id: 'biz-1',
          status: 'pending_review',
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('business', {
      userId: 'owner-1',
      businessId: 'biz-1',
      businessUserRole: 'admin',
    });

    const created = await repo.create(ctx, {
      contractorType: 'business',
      fullName: 'Nouveau Chauffeur',
      email: 'nouveau@boutique.cd',
      idDocumentUrl: 'https://files.example/id.jpg',
    });
    expect(insertStatus).toBe('pending_review');
    expect(created.status).toBe('pending_review');
    expect(created.contractorType).toBe('business');
  });

  it('updates the service area on an in-scope dossier', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM driver_dossiers WHERE id')) {
        return dossierRow({ status: 'active', service_area_id: null });
      }
      if (sqlIncludes(sql, 'FROM service_areas sa') && sqlIncludes(sql, 'JOIN cities')) {
        return { id: 'area-kwz', status: 'active', city_status: 'active' };
      }
      if (sqlIncludes(sql, 'UPDATE driver_dossiers') && sqlIncludes(sql, 'service_area_id')) {
        return dossierRow({ status: 'active', service_area_id: 'area-kwz' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    const updated = await repo.updateServiceArea(ctx, 'dossier-1', 'area-kwz');
    expect(updated.serviceAreaId).toBe('area-kwz');
  });

  it('lists and adds optional vehicle documents until the cap', async () => {
    const listed = {
      id: 'veh-1',
      driver_dossier_id: 'dossier-1',
      stored_ref: 'eveider://identity-documents/vehicle/admin-1/a.jpg',
      file_name: 'carte-grise.jpg',
      uploaded_by_user_id: 'admin-1',
      created_at: new Date('2026-09-21T12:00:00.000Z'),
    };
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM driver_dossiers WHERE id')) {
        return dossierRow({ status: 'active' });
      }
      if (sqlIncludes(sql, 'FROM driver_vehicle_documents') && sqlIncludes(sql, 'ORDER BY created_at')) {
        return listed;
      }
      if (sqlIncludes(sql, 'COUNT(*)::int') && sqlIncludes(sql, 'driver_vehicle_documents')) {
        return { n: 8 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    const docs = await repo.listVehicleDocuments(ctx, 'dossier-1');
    expect(docs).toEqual([
      {
        id: 'veh-1',
        driverDossierId: 'dossier-1',
        storedRef: 'eveider://identity-documents/vehicle/admin-1/a.jpg',
        fileName: 'carte-grise.jpg',
        uploadedByUserId: 'admin-1',
        createdAt: listed.created_at,
      },
    ]);

    await expect(
      repo.addVehicleDocument(ctx, 'dossier-1', {
        storedRef: 'eveider://identity-documents/vehicle/admin-1/b.jpg',
        fileName: 'assurance.jpg',
      }),
    ).rejects.toThrow('Au plus 8 documents véhicule');
  });

  it('inserts a vehicle document and deletes it by id', async () => {
    const inserted = {
      id: 'veh-2',
      driver_dossier_id: 'dossier-1',
      stored_ref: 'eveider://identity-documents/vehicle/admin-1/b.jpg',
      file_name: 'assurance.jpg',
      uploaded_by_user_id: 'admin-1',
      created_at: new Date('2026-09-21T12:00:00.000Z'),
    };
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM driver_dossiers WHERE id')) {
        return dossierRow({ status: 'active' });
      }
      if (sqlIncludes(sql, 'COUNT(*)') && sqlIncludes(sql, 'driver_vehicle_documents')) {
        return { n: 1 };
      }
      if (sqlIncludes(sql, 'INSERT INTO driver_vehicle_documents')) {
        return inserted;
      }
      if (sqlIncludes(sql, 'DELETE FROM driver_vehicle_documents')) {
        return inserted;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CourierDossierRepository(db);
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    const created = await repo.addVehicleDocument(ctx, 'dossier-1', {
      storedRef: inserted.stored_ref,
      fileName: inserted.file_name,
    });
    expect(created.id).toBe('veh-2');
    expect(created.fileName).toBe('assurance.jpg');

    const removed = await repo.deleteVehicleDocument(ctx, 'dossier-1', 'veh-2');
    expect(removed.id).toBe('veh-2');
  });
});
