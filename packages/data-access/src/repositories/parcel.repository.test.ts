import type { ParcelStatus } from '@eveider/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { ParcelRepository } from './parcel.repository.js';

function buildParcel(overrides: Partial<{
  id: string;
  businessId: string;
  customerId: string | null;
  status: ParcelStatus;
}> = {}) {
  return {
    id: 'parcel-1',
    reference: 'PK-001',
    status: 'created' as ParcelStatus,
    businessId: 'biz-1',
    customerId: null,
    recipientPhone: '+243000000000',
    recipientName: null,
    lockerId: null,
    compartmentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ParcelRepository', () => {
  const parcelCreate = vi.fn();
  const parcelFindUnique = vi.fn();
  const parcelFindUniqueOrThrow = vi.fn();
  const parcelUpdate = vi.fn();
  const parcelUpdateMany = vi.fn();
  const pickupPinFindUnique = vi.fn();
  const pickupPinCreate = vi.fn();
  const businessFindUniqueOrThrow = vi.fn();
  const findCustomerByPhone = vi.fn();
  const dispatchForNewParcel = vi.fn();
  const notifyParcelCreatedForCustomer = vi.fn();
  const notifyParcelStatusChange = vi.fn();

  const db = {
    parcel: {
      create: parcelCreate,
      findUnique: parcelFindUnique,
      findUniqueOrThrow: parcelFindUniqueOrThrow,
      findMany: vi.fn(),
      update: parcelUpdate,
      updateMany: parcelUpdateMany,
    },
    pickupPin: {
      findUnique: pickupPinFindUnique,
      create: pickupPinCreate,
    },
    business: {
      findUniqueOrThrow: businessFindUniqueOrThrow,
    },
  };

  const repo = new ParcelRepository(
    db as never,
    { notifyParcelCreatedForCustomer, notifyParcelStatusChange } as never,
    { dispatchForNewParcel } as never,
    { findCustomerByPhone } as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    businessFindUniqueOrThrow.mockResolvedValue({ id: 'biz-1', name: 'Pharmacy', status: 'active' });
    findCustomerByPhone.mockResolvedValue(null);
    dispatchForNewParcel.mockResolvedValue({
      status: 'pending',
      deepLink: 'eveider://invite/token',
      webLink: 'http://localhost:3000/invite/token',
      expiresAt: new Date().toISOString(),
      acceptedAt: null,
    });
  });

  it('creates parcel for active business scope', async () => {
    parcelCreate.mockResolvedValue(buildParcel());
    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });

    const result = await repo.create(ctx, {
      businessId: 'biz-1',
      reference: 'PK-001',
      recipientPhone: '+243000000000',
    });

    expect(parcelCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'created', reference: 'PK-001' }),
      }),
    );
    expect(result.recipientStatus).toBe('invited');
    expect(dispatchForNewParcel).toHaveBeenCalled();
  });

  it('rejects parcel creation when business cannot submit', async () => {
    businessFindUniqueOrThrow.mockResolvedValue({ id: 'biz-1', status: 'suspended' });
    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });

    await expect(
      repo.create(ctx, {
        businessId: 'biz-1',
        reference: 'PK-002',
        recipientPhone: '+243000000000',
      }),
    ).rejects.toThrow('cannot submit parcels');
  });

  it('applies domain transition on status update', async () => {
    parcelFindUniqueOrThrow.mockResolvedValue(buildParcel({ status: 'created' }));
    parcelUpdate.mockResolvedValue(buildParcel({ status: 'in_transit' }));
    const ctx = createDataAccessContext('courier');

    await repo.updateStatus(ctx, 'parcel-1', 'in_transit');

    expect(parcelUpdate).toHaveBeenCalledWith({
      where: { id: 'parcel-1' },
      data: { status: 'in_transit' },
    });
  });

  it('creates pickup PIN when status becomes ready_for_pickup', async () => {
    parcelFindUniqueOrThrow.mockResolvedValue(
      buildParcel({ status: 'delivered_to_locker' }),
    );
    parcelUpdate.mockResolvedValue(buildParcel({ status: 'ready_for_pickup' }));
    pickupPinFindUnique.mockResolvedValue(null);
    pickupPinCreate.mockResolvedValue({ id: 'pin-1', code: '123456' });
    const ctx = createDataAccessContext('admin');

    await repo.updateStatus(ctx, 'parcel-1', 'ready_for_pickup');

    expect(pickupPinCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parcelId: 'parcel-1',
          code: expect.stringMatching(/^\d{6}$/),
        }),
      }),
    );
  });

  it('rejects invalid parcel transition', async () => {
    parcelFindUniqueOrThrow.mockResolvedValue(buildParcel({ status: 'created' }));
    const ctx = createDataAccessContext('admin');

    await expect(repo.updateStatus(ctx, 'parcel-1', 'collected')).rejects.toThrow(
      'Invalid parcel transition',
    );
  });
});
