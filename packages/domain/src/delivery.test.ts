import { describe, expect, it } from 'vitest';
import {
  canTransitionDelivery,
  isTerminalDeliveryStatus,
  transitionDelivery,
} from './delivery.js';

describe('delivery lifecycle', () => {
  it('allows the courier flow', () => {
    expect(canTransitionDelivery('assigned', 'scanned')).toBe(true);
    expect(canTransitionDelivery('scanned', 'drop_off_pending')).toBe(true);
    expect(transitionDelivery('drop_off_pending', 'completed')).toBe('completed');
  });

  it('allows failure from non-terminal states', () => {
    expect(canTransitionDelivery('assigned', 'failed')).toBe(true);
    expect(canTransitionDelivery('drop_off_pending', 'failed')).toBe(true);
  });

  it('treats completed and failed as terminal', () => {
    expect(isTerminalDeliveryStatus('completed')).toBe(true);
    expect(isTerminalDeliveryStatus('failed')).toBe(true);
    expect(canTransitionDelivery('completed', 'assigned')).toBe(false);
  });
});
