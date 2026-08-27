import { describe, expect, it } from 'vitest';
import { completeDropOffSchema } from './delivery.js';

describe('completeDropOffSchema', () => {
  it('requires a drop-off photo', () => {
    expect(completeDropOffSchema.safeParse({}).success).toBe(false);
    expect(
      completeDropOffSchema.safeParse({
        photoBase64: `data:image/jpeg;base64,${'A'.repeat(40)}`,
      }).success,
    ).toBe(true);
  });
});
