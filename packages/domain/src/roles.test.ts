import { describe, expect, it } from 'vitest';
import {
  canManageDeliveries,
  canManageLockers,
  canReviewBusinessApplications,
  canSubmitParcels,
  canViewPickupPin,
  isAdminRole,
  isBusinessRole,
  isOperatorRole,
  isPlatformStaff,
  toApiRole,
  toDbRole,
} from './roles.js';

describe('role guards', () => {
  it('identifies admin, business, and operator roles', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isBusinessRole('business')).toBe(true);
    expect(isOperatorRole('operator')).toBe(true);
    expect(isPlatformStaff('admin')).toBe(true);
    expect(isPlatformStaff('operator')).toBe(true);
    expect(isPlatformStaff('business')).toBe(false);
    expect(isAdminRole('customer')).toBe(false);
  });

  it('enforces parcel submission scope', () => {
    expect(canSubmitParcels('business')).toBe(true);
    expect(canSubmitParcels('admin')).toBe(true);
    expect(canSubmitParcels('operator')).toBe(false);
    expect(canSubmitParcels('customer')).toBe(false);
  });

  it('enforces delivery management scope', () => {
    expect(canManageDeliveries('courier')).toBe(true);
    expect(canManageDeliveries('operator')).toBe(true);
    expect(canManageDeliveries('customer')).toBe(false);
  });

  it('restricts pickup PIN visibility', () => {
    expect(canViewPickupPin('customer')).toBe(true);
    expect(canViewPickupPin('business')).toBe(false);
    expect(canViewPickupPin('admin')).toBe(true);
    expect(canViewPickupPin('operator')).toBe(true);
  });

  it('keeps sensitive admin tools admin-only until operator UI exists', () => {
    expect(canReviewBusinessApplications('admin')).toBe(true);
    expect(canReviewBusinessApplications('operator')).toBe(false);
    expect(canManageLockers('admin')).toBe(true);
    expect(canManageLockers('operator')).toBe(false);
  });

  it('maps DB roles to API aliases without renaming storage', () => {
    expect(toApiRole('admin')).toBe('PLATFORM_ADMIN');
    expect(toApiRole('business')).toBe('BUSINESS_ADMIN');
    expect(toApiRole('operator')).toBe('OPERATOR');
    expect(toDbRole('PLATFORM_ADMIN')).toBe('admin');
    expect(toDbRole('CUSTOMER')).toBe('customer');
    expect(toDbRole('OPERATOR')).toBe('operator');
  });
});
