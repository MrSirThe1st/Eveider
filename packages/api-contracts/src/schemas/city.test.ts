import { describe, expect, it } from 'vitest';
import { createCitySchema, updateCitySchema } from './city.js';

describe('createCitySchema', () => {
  it('accepts a DRC city payload', () => {
    const result = createCitySchema.safeParse({ code: 'gom', name: 'Goma' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('GOM');
      expect(result.data.name).toBe('Goma');
    }
  });

  it('rejects a missing name', () => {
    expect(createCitySchema.safeParse({ code: 'TST' }).success).toBe(false);
  });
});

describe('updateCitySchema', () => {
  it('accepts archive', () => {
    expect(updateCitySchema.safeParse({ status: 'archived' }).success).toBe(true);
  });
});
