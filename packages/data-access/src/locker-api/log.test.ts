import { afterEach, describe, expect, it, vi } from 'vitest';
import { logLockerEvent } from './log.js';

describe('logLockerEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never prints PIN, return code, bearer token, or pin hash', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    logLockerEvent('action_authorized', {
      trackingNumber: 'EVD26F8F1NEW0A',
      pin: '811001',
      pickupPin: '811001',
      returnCode: '911001',
      token: 'locker-secret',
      authorization: 'Bearer locker-secret',
      pinHash: 'abc123',
      sessionId: 'session-1',
    });
    const payload = JSON.stringify(info.mock.calls[0]);
    expect(payload).toContain('EVD26F8F1NEW0A');
    expect(payload).toContain('session-1');
    expect(payload).not.toContain('811001');
    expect(payload).not.toContain('911001');
    expect(payload).not.toContain('locker-secret');
    expect(payload).not.toContain('abc123');
  });
});
