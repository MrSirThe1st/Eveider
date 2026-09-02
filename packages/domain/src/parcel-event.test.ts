import { describe, expect, it } from 'vitest';
import { isOrganizationNotifyEventType } from './parcel-event.js';

describe('isOrganizationNotifyEventType', () => {
  it('forwards lifecycle events organisations care about', () => {
    expect(isOrganizationNotifyEventType('parcel.created')).toBe(true);
    expect(isOrganizationNotifyEventType('delivery.completed')).toBe(true);
    expect(isOrganizationNotifyEventType('issue.opened')).toBe(true);
  });

  it('skips internal scan / PIN / notification channel events', () => {
    expect(isOrganizationNotifyEventType('delivery.scanned')).toBe(false);
    expect(isOrganizationNotifyEventType('pickup_pin.issued')).toBe(false);
    expect(isOrganizationNotifyEventType('notification.sent')).toBe(false);
  });
});
