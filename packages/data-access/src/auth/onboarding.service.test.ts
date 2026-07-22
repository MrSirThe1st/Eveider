import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSqlMatchMock } from '../test/query-mock.js';
import { OnboardingService } from './onboarding.service.js';

describe('OnboardingService', () => {
  const findByAuthId = vi.fn();
  const createProfile = vi.fn();
  const businessCreate = vi.fn();
  const db = createSqlMatchMock(() => null);

  const service = new OnboardingService(
    { findByAuthId, createProfile } as never,
    { create: businessCreate } as never,
    db,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns existing profile without creating duplicate', async () => {
    const existing = { id: 'u-1', authId: 'auth-1', role: 'customer' };
    findByAuthId.mockResolvedValue(existing);

    const result = await service.ensureProfile('auth-1', { role: 'customer' });

    expect(result).toBe(existing);
    expect(createProfile).not.toHaveBeenCalled();
  });

  it('creates business and user for business onboarding', async () => {
    findByAuthId.mockResolvedValue(null);
    businessCreate.mockResolvedValue({ id: 'biz-1', name: 'Shop' });
    createProfile.mockResolvedValue({ id: 'u-1', role: 'business', businessId: 'biz-1' });

    await service.ensureProfile('auth-1', {
      role: 'business',
      phone: '+243800000000',
      business: { name: 'Shop Kinshasa' },
    });

    expect(businessCreate).toHaveBeenCalled();
    expect(createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'business', businessId: 'biz-1' }),
    );
  });

  it('rejects wrong role for app', async () => {
    findByAuthId.mockResolvedValue({ id: 'u-1', role: 'customer', isBlocked: false });

    await expect(service.requireRole('auth-1', ['admin'])).rejects.toThrow('Rôle non autorisé');
  });
});
