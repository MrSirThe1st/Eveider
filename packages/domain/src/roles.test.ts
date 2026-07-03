import { describe, expect, it } from 'vitest';
import {
  canManageDeliveries,
  canSubmitParcels,
  canViewPickupPin,
  isAdminRole,
  isBusinessRole,
} from './roles.js';

describe('role guards', () => {
  it('identifies admin and business roles', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isBusinessRole('business')).toBe(true);
    expect(isAdminRole('customer')).toBe(false);
  });

  it('enforces parcel submission scope', () => {
    expect(canSubmitParcels('business')).toBe(true);
    expect(canSubmitParcels('customer')).toBe(false);
  });

  it('enforces delivery management scope', () => {
    expect(canManageDeliveries('courier')).toBe(true);
    expect(canManageDeliveries('customer')).toBe(false);
  });

  it('restricts pickup PIN visibility', () => {
    expect(canViewPickupPin('customer')).toBe(true);
    expect(canViewPickupPin('business')).toBe(false);
    expect(canViewPickupPin('admin')).toBe(true);
  });
});
