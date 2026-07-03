import { describe, expect, it } from 'vitest';
import { parcelStatusSchema, userRoleSchema } from './schemas.js';

describe('domain-aligned zod schemas', () => {
  it('accepts valid parcel statuses', () => {
    expect(parcelStatusSchema.parse('ready_for_pickup')).toBe('ready_for_pickup');
  });

  it('rejects invalid parcel statuses', () => {
    expect(() => parcelStatusSchema.parse('shipped')).toThrow();
  });

  it('accepts valid user roles', () => {
    expect(userRoleSchema.parse('courier')).toBe('courier');
  });
});
