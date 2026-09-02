import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import {
  createSqlMatchMock,
  parcelEventRow,
  sqlIncludes,
} from '../test/query-mock.js';
import {
  appendParcelEvent,
  ParcelEventRepository,
  resolveEventActor,
} from './parcel-event.repository.js';

describe('resolveEventActor', () => {
  it('uses user when ctx has userId', () => {
    expect(resolveEventActor(createDataAccessContext('admin', { userId: 'admin-1' }))).toEqual({
      actorType: 'user',
      actorUserId: 'admin-1',
    });
  });

  it('falls back to system when no user', () => {
    expect(resolveEventActor(createDataAccessContext('admin', {}))).toEqual({
      actorType: 'system',
      actorUserId: null,
    });
    expect(resolveEventActor(null)).toEqual({
      actorType: 'system',
      actorUserId: null,
    });
  });

  it('uses api_key when ctx has apiKeyId', () => {
    expect(
      resolveEventActor(
        createDataAccessContext({
          organizationId: 'biz-1',
          organizationRole: 'admin',
          apiKeyId: 'key-1',
        }),
      ),
    ).toEqual({
      actorType: 'api_key',
      actorUserId: null,
    });
  });
});

describe('ParcelEventRepository', () => {
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends an event and maps the row', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'INSERT INTO parcel_events')) {
        return parcelEventRow({
          event_type: 'delivery.completed',
          delivery_id: 'delivery-1',
          previous_delivery_status: 'drop_off_pending',
          new_delivery_status: 'completed',
          payload: { hasProof: true },
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const event = await appendParcelEvent(db, {
      parcelId: 'parcel-1',
      deliveryId: 'delivery-1',
      eventType: 'delivery.completed',
      actor: { actorType: 'user', actorUserId: 'courier-1' },
      previousDeliveryStatus: 'drop_off_pending',
      newDeliveryStatus: 'completed',
      payload: { hasProof: true },
    });

    expect(event.eventType).toBe('delivery.completed');
    expect(event.deliveryId).toBe('delivery-1');
    expect(event.payload).toEqual({ hasProof: true });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parcel_events'),
      expect.arrayContaining([
        'parcel-1',
        'delivery-1',
        'delivery.completed',
        'user',
        'courier-1',
      ]),
    );
  });

  it('lists events oldest to newest with actor names', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM parcel_events e') && sqlIncludes(sql, 'ORDER BY e.created_at ASC')) {
        return [
          parcelEventRow({
            id: 'event-1',
            event_type: 'parcel.created',
            actor_full_name: 'Admin Eveider',
            actor_email: 'admin@eveider.cd',
          }),
          parcelEventRow({
            id: 'event-2',
            event_type: 'delivery.assigned',
            delivery_id: 'delivery-1',
            actor_full_name: 'Admin Eveider',
            actor_email: 'admin@eveider.cd',
          }),
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const repo = new ParcelEventRepository(db);
    const events = await repo.listForParcel(adminCtx, 'parcel-1');

    expect(events).toHaveLength(2);
    expect(events[0]?.eventType).toBe('parcel.created');
    expect(events[0]?.actorFullName).toBe('Admin Eveider');
    expect(events[1]?.eventType).toBe('delivery.assigned');
  });

  it('lists events for an owning business with view_parcels', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT 1 FROM parcels')) {
        return { '?column?': 1 };
      }
      if (sqlIncludes(sql, 'FROM parcel_events e') && sqlIncludes(sql, 'ORDER BY e.created_at ASC')) {
        return [
          parcelEventRow({
            id: 'event-1',
            event_type: 'parcel.created',
            actor_full_name: 'Chantal Kasongo',
            actor_email: 'boutique.lubum@eveider.cd',
          }),
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new ParcelEventRepository(db);
    const businessCtx = createDataAccessContext('business', {
      userId: 'biz-user-1',
      businessId: 'biz-1',
      businessUserRole: 'admin',
    });

    const events = await repo.listForParcel(businessCtx, 'parcel-1');
    expect(events).toHaveLength(1);
    expect(events[0]?.actorFullName).toBe('Chantal Kasongo');
  });

  it('rejects business list when the parcel is out of scope', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT 1 FROM parcels')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new ParcelEventRepository(db);
    const businessCtx = createDataAccessContext('business', {
      userId: 'biz-user-1',
      businessId: 'biz-1',
      businessUserRole: 'admin',
    });

    await expect(repo.listForParcel(businessCtx, 'parcel-other')).rejects.toThrow('hors périmètre');
  });
});
