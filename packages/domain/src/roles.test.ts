import { describe, expect, it } from 'vitest';
import {
  canAdministerPlatform,
  canManageLockers,
  canReviewOrganizationApplications,
  isPlatformStaff,
  isSuperAdmin,
} from './roles.js';

describe('platform roles', () => {
  it('treats super admin and admin as platform staff', () => {
    expect(isPlatformStaff('super_admin')).toBe(true);
    expect(isPlatformStaff('admin')).toBe(true);
    expect(isPlatformStaff(null)).toBe(false);
    expect(isSuperAdmin('super_admin')).toBe(true);
    expect(isSuperAdmin('admin')).toBe(false);
  });

  it('lets both platform roles administer the platform', () => {
    expect(canAdministerPlatform('super_admin')).toBe(true);
    expect(canAdministerPlatform('admin')).toBe(true);
    expect(canReviewOrganizationApplications('admin')).toBe(true);
    expect(canManageLockers('super_admin')).toBe(true);
  });
});
