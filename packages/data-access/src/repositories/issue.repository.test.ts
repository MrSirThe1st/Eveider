import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { IssueRepository } from './issue.repository.js';

describe('IssueRepository', () => {
  const issueCreate = vi.fn();
  const issueFindMany = vi.fn();
  const issueFindUnique = vi.fn();
  const issueFindUniqueOrThrow = vi.fn();
  const issueUpdate = vi.fn();
  const parcelFindUniqueOrThrow = vi.fn();
  const parcelFindUnique = vi.fn();
  const deliveryFindFirst = vi.fn();
  const lockerFindUniqueOrThrow = vi.fn();

  const db = {
    issue: {
      create: issueCreate,
      findMany: issueFindMany,
      findUnique: issueFindUnique,
      findUniqueOrThrow: issueFindUniqueOrThrow,
      update: issueUpdate,
    },
    parcel: {
      findUniqueOrThrow: parcelFindUniqueOrThrow,
      findUnique: parcelFindUnique,
    },
    delivery: {
      findFirst: deliveryFindFirst,
    },
    locker: {
      findUniqueOrThrow: lockerFindUniqueOrThrow,
    },
  };

  const repo = new IssueRepository(db as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates issue for customer with parcel scope', async () => {
    const ctx = createDataAccessContext('customer', {
      userId: 'user-1',
      phone: '+243800000000',
    });

    parcelFindUniqueOrThrow.mockResolvedValue({
      id: 'parcel-1',
      customerId: 'user-1',
      recipientPhone: '+243800000000',
      lockerId: 'locker-1',
    });

    issueCreate.mockResolvedValue({
      id: 'issue-1',
      type: 'parcel_problem',
      status: 'open',
      description: 'Colis endommagé',
      parcelId: 'parcel-1',
      lockerId: 'locker-1',
      reporterId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      parcel: { id: 'parcel-1', reference: 'PK-001' },
      locker: { id: 'locker-1', name: 'GOMBE' },
      reporter: { id: 'user-1', fullName: 'Jean', email: null, role: 'customer' },
    });

    const issue = await repo.create(ctx, {
      type: 'parcel_problem',
      parcelId: 'parcel-1',
      description: 'Colis endommagé',
    });

    expect(issue.id).toBe('issue-1');
    expect(issueCreate).toHaveBeenCalledOnce();
  });

  it('rejects courier issue without assigned delivery', async () => {
    const ctx = createDataAccessContext('courier', { userId: 'courier-1' });
    deliveryFindFirst.mockResolvedValue(null);

    await expect(
      repo.create(ctx, {
        type: 'failed_delivery',
        parcelId: 'parcel-1',
        description: 'Impossible de livrer',
      }),
    ).rejects.toThrow('Livraison non assignée');
  });

  it('updates status for admin', async () => {
    const ctx = createDataAccessContext('admin', { userId: 'admin-1' });

    issueFindUniqueOrThrow.mockResolvedValue({
      id: 'issue-1',
      status: 'open',
    });

    issueUpdate.mockResolvedValue({
      id: 'issue-1',
      type: 'parcel_problem',
      status: 'in_progress',
      description: 'Test',
      parcelId: null,
      lockerId: null,
      reporterId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      parcel: null,
      locker: null,
      reporter: { id: 'user-1', fullName: 'Jean', email: null, role: 'customer' },
    });

    const issue = await repo.updateStatus(ctx, 'issue-1', 'in_progress');
    expect(issue.status).toBe('in_progress');
  });

  it('denies status update for customer', async () => {
    const ctx = createDataAccessContext('customer', { userId: 'user-1' });

    await expect(repo.updateStatus(ctx, 'issue-1', 'resolved')).rejects.toThrow(
      'Admin role required',
    );
  });
});
