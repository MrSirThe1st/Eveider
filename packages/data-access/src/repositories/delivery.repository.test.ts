import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { DeliveryRepository } from './delivery.repository.js';

function buildParcel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'parcel-1',
    reference: 'PK-001',
    status: 'created',
    businessId: 'biz-1',
    customerId: null,
    recipientPhone: '+243000000000',
    recipientName: 'Client',
    lockerId: 'locker-1',
    compartmentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    locker: { id: 'locker-1', name: 'EVEIDER GOMBE', address: 'Gombe', status: 'active' },
    business: { id: 'biz-1', name: 'Shop' },
    compartment: null,
    ...overrides,
  };
}

function buildDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: 'delivery-1',
    parcelId: 'parcel-1',
    courierId: 'courier-1',
    status: 'assigned',
    scannedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    parcel: buildParcel(),
    ...overrides,
  };
}

describe('DeliveryRepository', () => {
  const deliveryCreate = vi.fn();
  const deliveryFindFirst = vi.fn();
  const deliveryFindUnique = vi.fn();
  const deliveryFindMany = vi.fn();
  const deliveryUpdate = vi.fn();
  const parcelFindUniqueOrThrow = vi.fn();
  const userFindUniqueOrThrow = vi.fn();
  const compartmentFindFirst = vi.fn();
  const compartmentUpdate = vi.fn();
  const parcelUpdate = vi.fn();
  const pickupPinFindUnique = vi.fn();
  const pickupPinCreate = vi.fn();
  const transaction = vi.fn();

  const deliveryGroupBy = vi.fn();
  const db = {
    delivery: {
      create: deliveryCreate,
      findFirst: deliveryFindFirst,
      findUnique: deliveryFindUnique,
      findMany: deliveryFindMany,
      update: deliveryUpdate,
      groupBy: deliveryGroupBy,
    },
    parcel: {
      findUniqueOrThrow: parcelFindUniqueOrThrow,
      update: parcelUpdate,
      findUnique: vi.fn(),
    },
    user: {
      findUniqueOrThrow: userFindUniqueOrThrow,
    },
    compartment: {
      findFirst: compartmentFindFirst,
      update: compartmentUpdate,
      findFirstOrThrow: vi.fn(),
    },
    pickupPin: {
      findUnique: pickupPinFindUnique,
      create: pickupPinCreate,
    },
    $transaction: transaction,
  };

  const repo = new DeliveryRepository(db as never);
  const courierCtx = createDataAccessContext('courier', { userId: 'courier-1' });
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input(db);
      }
      return Promise.all(input as Promise<unknown>[]);
    });
  });

  it('assigns delivery for admin when parcel has locker', async () => {
    parcelFindUniqueOrThrow.mockResolvedValue(buildParcel());
    userFindUniqueOrThrow.mockResolvedValue({ id: 'courier-1', role: 'courier' });
    deliveryFindFirst.mockResolvedValue(null);
    deliveryCreate.mockResolvedValue({ id: 'delivery-1', status: 'assigned' });

    await repo.assign(adminCtx, 'parcel-1', 'courier-1');

    expect(deliveryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parcelId: 'parcel-1',
          courierId: 'courier-1',
          status: 'assigned',
        }),
      }),
    );
  });

  it('rejects assign when active delivery exists', async () => {
    parcelFindUniqueOrThrow.mockResolvedValue(buildParcel());
    userFindUniqueOrThrow.mockResolvedValue({ id: 'courier-1', role: 'courier' });
    deliveryFindFirst.mockResolvedValue({ id: 'existing' });

    await expect(repo.assign(adminCtx, 'parcel-1', 'courier-1')).rejects.toThrow(
      'livraison active',
    );
  });

  it('scans parcel with matching reference', async () => {
    deliveryFindUnique
      .mockResolvedValueOnce(buildDelivery())
      .mockResolvedValueOnce(buildDelivery({ status: 'scanned', scannedAt: new Date() }));
    deliveryUpdate.mockResolvedValue({});

    const result = await repo.scan(courierCtx, 'delivery-1', 'pk-001');

    expect(deliveryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'scanned' }),
      }),
    );
    expect(result.status).toBe('scanned');
  });

  it('rejects scan with wrong reference', async () => {
    deliveryFindUnique.mockResolvedValue(buildDelivery());

    await expect(repo.scan(courierCtx, 'delivery-1', 'WRONG')).rejects.toThrow('incorrecte');
  });

  it('rejects courier access to another courier delivery', async () => {
    deliveryFindUnique.mockResolvedValue(buildDelivery({ courierId: 'other-courier' }));

    await expect(repo.findByIdForCourier(courierCtx, 'delivery-1')).rejects.toThrow('périmètre');
  });

  it('lists active deliveries for admin with filters', async () => {
    deliveryFindMany.mockResolvedValue([buildDelivery()]);

    await repo.listForAdmin(adminCtx, { status: 'scanned', courierId: 'courier-1' });

    expect(deliveryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'scanned',
          courierId: 'courier-1',
        }),
      }),
    );
  });

  it('summarizes active delivery counts for admin', async () => {
    deliveryGroupBy.mockResolvedValue([
      { status: 'assigned', _count: { id: 2 } },
      { status: 'scanned', _count: { id: 1 } },
    ]);

    const summary = await repo.getActiveSummary(adminCtx);

    expect(summary).toEqual({
      assigned: 2,
      scanned: 1,
      drop_off_pending: 0,
      total: 3,
    });
  });

  it('completes drop-off with sequential transaction writes', async () => {
    deliveryFindUnique
      .mockResolvedValueOnce(
        buildDelivery({
          status: 'drop_off_pending',
          parcel: buildParcel({ status: 'in_transit' }),
        }),
      )
      .mockResolvedValueOnce(
        buildDelivery({
          status: 'completed',
          completedAt: new Date(),
          parcel: buildParcel({ status: 'ready_for_pickup' }),
        }),
      );
    compartmentFindFirst.mockResolvedValue({ id: 'comp-1', label: 'A1', status: 'available' });
    pickupPinFindUnique.mockResolvedValue(null);
    deliveryUpdate.mockResolvedValue({});
    compartmentUpdate.mockResolvedValue({});
    parcelUpdate.mockResolvedValue({});
    pickupPinCreate.mockResolvedValue({});

    await repo.completeDropOff(courierCtx, 'delivery-1');

    expect(transaction).toHaveBeenCalledTimes(1);
    const [writes] = transaction.mock.calls[0] as [unknown[]];
    expect(Array.isArray(writes)).toBe(true);
    expect(writes).toHaveLength(4);
    expect(deliveryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
    expect(compartmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comp-1' },
        data: { status: 'occupied' },
      }),
    );
    expect(parcelUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ready_for_pickup',
          compartmentId: 'comp-1',
        }),
      }),
    );
    expect(pickupPinCreate).toHaveBeenCalled();
  });
});
