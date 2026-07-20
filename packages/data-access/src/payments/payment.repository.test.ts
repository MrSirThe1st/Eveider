import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { PaymentRepository } from './payment.repository.js';

describe('PaymentRepository', () => {
  const parcelFindUnique = vi.fn();
  const parcelPaymentFindFirst = vi.fn();
  const parcelPaymentCreate = vi.fn();
  const parcelPaymentUpdate = vi.fn();

  const db = {
    parcel: { findUnique: parcelFindUnique },
    parcelPayment: {
      findFirst: parcelPaymentFindFirst,
      findUnique: vi.fn(),
      create: parcelPaymentCreate,
      update: parcelPaymentUpdate,
    },
  };

  const repo = new PaymentRepository(db as never);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAWAPAY_API_TOKEN = 'token';
    process.env.PAWAPAY_API_BASE_URL = 'https://api.sandbox.pawapay.io';
    process.env.PAWAPAY_PICKUP_FEE_AMOUNT = '5';
    process.env.PAWAPAY_PICKUP_FEE_CURRENCY = 'USD';
  });

  it('returns pickup payment summary with configured fee', async () => {
    parcelPaymentFindFirst.mockResolvedValue(null);

    const summary = await repo.getPickupPaymentSummary('parcel-1');

    expect(summary).toMatchObject({
      required: true,
      status: 'none',
      amount: '5',
      currency: 'USD',
    });
  });

  it('blocks payment initiation when parcel is not ready for pickup', async () => {
    const ctx = createDataAccessContext('customer', {
      userId: 'user-1',
      phone: '+243800000000',
    });
    parcelFindUnique.mockResolvedValue({
      id: 'parcel-1',
      status: 'in_transit',
      customerId: 'user-1',
      recipientPhone: '+243800000000',
    });

    await expect(
      repo.initiatePickupPayment(ctx, 'parcel-1', { provider: 'ORANGE_COD' }),
    ).rejects.toThrow('prêt au retrait');
  });

  it('marks payment completed from callback', async () => {
    db.parcelPayment.findUnique = vi.fn().mockResolvedValue({
      id: 'payment-1',
      depositId: 'deposit-1',
      completedAt: null,
    });
    parcelPaymentUpdate.mockResolvedValue({
      id: 'payment-1',
      status: 'completed',
      depositId: 'deposit-1',
    });

    const updated = await repo.applyDepositCallback({
      depositId: 'deposit-1',
      status: 'COMPLETED',
    });

    expect(updated?.status).toBe('completed');
    expect(parcelPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
  });
});
