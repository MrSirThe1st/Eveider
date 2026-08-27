import { describe, expect, it } from 'vitest';
import {
  AccessDeniedError,
  assertAdmin,
  assertBusinessScope,
  assertCompanyPermission,
  assertCustomerOwnsParcel,
  createDataAccessContext,
} from './context.js';

describe('DataAccessContext', () => {
  it('allows admin cross-business access', () => {
    expect(() =>
      assertBusinessScope(createDataAccessContext('admin'), 'biz-1'),
    ).not.toThrow();
  });

  it('restricts business to own businessId', () => {
    expect(() =>
      assertBusinessScope(createDataAccessContext('business', { businessId: 'biz-1' }), 'biz-1'),
    ).not.toThrow();
    expect(() =>
      assertBusinessScope(createDataAccessContext('business', { businessId: 'biz-1' }), 'biz-2'),
    ).toThrow(AccessDeniedError);
  });

  it('restricts customer to own parcels', () => {
    expect(() =>
      assertCustomerOwnsParcel(createDataAccessContext('customer', { userId: 'u-1' }), 'u-1'),
    ).not.toThrow();
    expect(() =>
      assertCustomerOwnsParcel(createDataAccessContext('customer', { userId: 'u-1' }), 'u-2'),
    ).toThrow(AccessDeniedError);
  });

  it('allows customer access by matching recipient phone', () => {
    expect(() =>
      assertCustomerOwnsParcel(
        createDataAccessContext('customer', { userId: 'u-1', phone: '+243800000000' }),
        null,
        '+243800000000',
      ),
    ).not.toThrow();
  });

  it('requires admin role', () => {
    expect(() => assertAdmin(createDataAccessContext('courier'))).toThrow(AccessDeniedError);
    expect(() => assertAdmin(createDataAccessContext('admin'))).not.toThrow();
  });

  it('enforces organization membership permissions', () => {
    const dispatcher = createDataAccessContext('business', {
      userId: 'u-1',
      businessId: 'biz-1',
      businessUserRole: 'dispatcher',
    });
    expect(() => assertCompanyPermission(dispatcher, 'view_parcels')).not.toThrow();
    expect(() => assertCompanyPermission(dispatcher, 'create_parcels')).not.toThrow();
    expect(() => assertCompanyPermission(dispatcher, 'manage_team')).toThrow(AccessDeniedError);
    expect(() =>
      assertCompanyPermission(
        createDataAccessContext('business', {
          userId: 'u-2',
          businessId: 'biz-1',
          businessUserRole: 'admin',
        }),
        'manage_team',
      ),
    ).not.toThrow();
  });
});
