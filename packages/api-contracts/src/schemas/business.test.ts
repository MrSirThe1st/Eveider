import { describe, expect, it } from 'vitest';
import { updateBusinessStatusSchema } from './business.js';

describe('updateBusinessStatusSchema', () => {
  it('accepts valid business status', () => {
    expect(updateBusinessStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(updateBusinessStatusSchema.safeParse({ status: 'invalid' }).success).toBe(false);
  });
});
