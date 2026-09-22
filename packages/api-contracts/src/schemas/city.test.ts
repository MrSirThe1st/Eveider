import { describe, expect, it } from 'vitest';
import { createCitySchema, updateCitySchema } from './city.js';

describe('createCitySchema', () => {
  it('accepts a catalog city id', () => {
    const result = createCitySchema.safeParse({
      drcCityId: '8c230b00-41da-476b-b204-76939fea3e56',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing catalog city', () => {
    expect(createCitySchema.safeParse({ notes: 'test' }).success).toBe(false);
  });

  it('rejects a typed city code payload', () => {
    expect(createCitySchema.safeParse({ code: 'GOM', name: 'Goma' }).success).toBe(false);
  });
});

describe('updateCitySchema', () => {
  it('accepts archive', () => {
    expect(updateCitySchema.safeParse({ status: 'archived' }).success).toBe(true);
  });

  it('ignores a name change because the catalog owns the name', () => {
    expect(updateCitySchema.parse({ name: 'Goma', notes: 'ok' })).toEqual({ notes: 'ok' });
  });
});
