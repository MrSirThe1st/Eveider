import { describe, expect, it } from 'vitest';
import {
  createLockerLayoutTemplateSchema,
  updateLockerNetworkSettingsSchema,
} from './locker-settings.js';

const cells3x3 = Array.from({ length: 9 }, (_, index) => {
  const row = String.fromCharCode(65 + Math.floor(index / 3));
  const col = (index % 3) + 1;
  return { label: `${row}${col}`, size: 'medium' as const };
});

describe('updateLockerNetworkSettingsSchema', () => {
  it('accepts valid settings', () => {
    const result = updateLockerNetworkSettingsSchema.safeParse({
      sizeMatchingMode: 'exact_or_larger',
      assignmentStrategy: 'smallest_fit',
      pickupHoldHours: 48,
      pickupReminderHours: 24,
    });
    expect(result.success).toBe(true);
  });

  it('rejects reminder after hold', () => {
    const result = updateLockerNetworkSettingsSchema.safeParse({
      sizeMatchingMode: 'exact',
      assignmentStrategy: 'first_available',
      pickupHoldHours: 24,
      pickupReminderHours: 48,
    });
    expect(result.success).toBe(false);
  });
});

describe('createLockerLayoutTemplateSchema', () => {
  it('accepts a matching grid', () => {
    const result = createLockerLayoutTemplateSchema.safeParse({
      name: 'Mixte 3×3',
      rows: 3,
      columns: 3,
      cells: cells3x3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched cell counts', () => {
    const result = createLockerLayoutTemplateSchema.safeParse({
      name: 'Bad',
      rows: 3,
      columns: 3,
      cells: cells3x3.slice(0, 4),
    });
    expect(result.success).toBe(false);
  });
});
