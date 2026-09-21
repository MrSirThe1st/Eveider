import { describe, expect, it } from 'vitest';
import { inlineAlertAutoDismissMs } from './inline-alert.js';

describe('inlineAlertAutoDismissMs', () => {
  it('hides success and error banners after a short delay', () => {
    expect(inlineAlertAutoDismissMs('success')).toBe(5000);
    expect(inlineAlertAutoDismissMs('error')).toBe(7000);
  });

  it('keeps info notices until they are closed', () => {
    expect(inlineAlertAutoDismissMs('info')).toBe(0);
  });

  it('accepts an explicit delay, including 0 to persist', () => {
    expect(inlineAlertAutoDismissMs('success', 0)).toBe(0);
    expect(inlineAlertAutoDismissMs('info', 3000)).toBe(3000);
  });
});
