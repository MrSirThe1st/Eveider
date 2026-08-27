import { describe, expect, it } from 'vitest';
import {
  getBusinessPermissions,
  hasBusinessPermission,
  isCompanyAdminRole,
  resolveBusinessUserRole,
} from './organization-roles.js';

describe('organization roles', () => {
  it('treats a missing or legacy membership role as org admin', () => {
    expect(resolveBusinessUserRole(null)).toBe('admin');
    expect(resolveBusinessUserRole('owner')).toBe('admin');
    expect(isCompanyAdminRole(undefined)).toBe(true);
  });

  it('gives org admin access except ownership transfer', () => {
    expect(hasBusinessPermission('admin', 'manage_team')).toBe(true);
    expect(hasBusinessPermission('admin', 'billing')).toBe(true);
    expect(hasBusinessPermission('admin', 'transfer_ownership')).toBe(false);
    expect(getBusinessPermissions('admin')).toHaveLength(9);
  });

  it('maps former logistics/ops/viewer roles to dispatcher', () => {
    expect(resolveBusinessUserRole('logistics_manager')).toBe('dispatcher');
    expect(hasBusinessPermission('logistics_manager', 'view_reports')).toBe(true);
    expect(hasBusinessPermission('logistics_manager', 'create_parcels')).toBe(true);
    expect(hasBusinessPermission('logistics_manager', 'billing')).toBe(false);
    expect(hasBusinessPermission('logistics_manager', 'manage_team')).toBe(false);
    expect(hasBusinessPermission('logistics_manager', 'manage_couriers')).toBe(true);
    expect(hasBusinessPermission('operations_staff', 'manage_operations')).toBe(true);
    expect(hasBusinessPermission('viewer', 'view_parcels')).toBe(true);
    expect(hasBusinessPermission('viewer', 'create_parcels')).toBe(true);
  });

  it('gives the account owner transfer_ownership', () => {
    expect(hasBusinessPermission('account_owner', 'transfer_ownership')).toBe(true);
    expect(hasBusinessPermission('account_owner', 'manage_team')).toBe(true);
  });
});
