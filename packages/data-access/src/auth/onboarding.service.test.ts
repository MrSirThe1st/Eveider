import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSqlMatchMock } from '../test/query-mock.js';
import { OnboardingService } from './onboarding.service.js';

describe('OnboardingService', () => {
  const findByAuthId = vi.fn();
  const createProfile = vi.fn();
  const businessCreate = vi.fn();
  const membershipUpsert = vi.fn();
  const listByUserIdWithOrgFlags = vi.fn();
  const db = createSqlMatchMock(() => null);

  const service = new OnboardingService(
    { findByAuthId, createProfile } as never,
    { create: businessCreate } as never,
    { upsert: membershipUpsert, listByUserIdWithOrgFlags } as never,
    db,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns existing profile without creating duplicate', async () => {
    const existing = { id: 'u-1', authId: 'auth-1', isCustomer: true };
    findByAuthId.mockResolvedValue(existing);

    const result = await service.ensureProfile('auth-1', { role: 'customer' });

    expect(result).toBe(existing);
    expect(createProfile).not.toHaveBeenCalled();
  });

  it('creates organization and account owner membership', async () => {
    findByAuthId.mockResolvedValue(null);
    businessCreate.mockResolvedValue({ id: 'biz-1', name: 'Shop' });
    createProfile.mockResolvedValue({ id: 'u-1', isCustomer: false });

    await service.ensureProfile('auth-1', {
      role: 'organization',
      phone: '+243800000000',
      business: { name: 'Shop Kinshasa' },
    });

    expect(businessCreate).toHaveBeenCalled();
    expect(createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ authId: 'auth-1', phone: '+243800000000' }),
    );
    expect(membershipUpsert).toHaveBeenCalledWith({
      userId: 'u-1',
      businessId: 'biz-1',
      role: 'account_owner',
    });
  });

  it('rejects wrong role for app', async () => {
    findByAuthId.mockResolvedValue({
      id: 'u-1',
      isCustomer: true,
      platformRole: null,
      isBlocked: false,
    });
    listByUserIdWithOrgFlags.mockResolvedValue([]);

    await expect(service.requireRole('auth-1', ['admin'])).rejects.toThrow('Rôle non autorisé');
  });

  it('rejects deleted and deactivated accounts', async () => {
    findByAuthId.mockResolvedValue({
      id: 'u-1',
      isCustomer: true,
      isBlocked: false,
      deletedAt: new Date(),
    });
    await expect(service.requireProfile('auth-1')).rejects.toThrow('Compte supprimé');

    findByAuthId.mockResolvedValue({
      id: 'u-2',
      isCustomer: false,
      isBlocked: false,
      deactivatedAt: new Date(),
    });
    await expect(service.requireProfile('auth-2')).rejects.toThrow('Compte désactivé');
  });
});
