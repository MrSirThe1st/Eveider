import { describe, expect, it, vi } from 'vitest';
import {
  apiKeyLooksValid,
  generateOrganizationApiKey,
  hashOrganizationApiKey,
  notificationSignatureHeader,
  signNotificationBody,
} from './secrets.js';
import {
  buildOrganizationNotificationPayload,
  isAllowedNotificationUrl,
} from './notify.js';
import type { ParcelEvent } from '../db/types.js';

describe('organization api secrets', () => {
  it('hashes a generated key and exposes a short prefix', () => {
    const generated = generateOrganizationApiKey();
    expect(apiKeyLooksValid(generated.plaintext)).toBe(true);
    expect(hashOrganizationApiKey(generated.plaintext)).toBe(generated.hash);
    expect(generated.prefix.startsWith('eveider_live_')).toBe(true);
    expect(generated.prefix.length).toBeLessThan(generated.plaintext.length);
  });

  it('signs a body with HMAC-SHA256', () => {
    const body = '{"type":"parcel.created"}';
    const hex = signNotificationBody('test-secret', body);
    expect(hex).toHaveLength(64);
    expect(notificationSignatureHeader('test-secret', body)).toBe(`sha256=${hex}`);
  });
});

describe('notification URL', () => {
  it('allows https and local http', () => {
    expect(isAllowedNotificationUrl('https://shop.example/notify')).toBe(true);
    expect(isAllowedNotificationUrl('http://localhost:4000/hook')).toBe(true);
    expect(isAllowedNotificationUrl('http://example.com/hook')).toBe(false);
    expect(isAllowedNotificationUrl('not-a-url')).toBe(false);
  });
});

describe('notification payload', () => {
  it('omits PIN and maps status fields', () => {
    const event: ParcelEvent = {
      id: 'evt-1',
      parcelId: 'parcel-1',
      deliveryId: null,
      issueId: null,
      compartmentId: null,
      eventType: 'parcel.created',
      actorType: 'api_key',
      actorUserId: null,
      previousParcelStatus: null,
      newParcelStatus: 'created',
      previousDeliveryStatus: null,
      newDeliveryStatus: null,
      payload: {},
      createdAt: new Date('2026-09-02T12:00:00.000Z'),
    };
    expect(
      buildOrganizationNotificationPayload(event, {
        id: 'parcel-1',
        trackingNumber: 'EVD26TEST0001A',
        status: 'created',
      }),
    ).toEqual({
      id: 'evt-1',
      type: 'parcel.created',
      createdAt: '2026-09-02T12:00:00.000Z',
      parcel: { id: 'parcel-1', trackingNumber: 'EVD26TEST0001A', status: 'created' },
      previousParcelStatus: null,
      newParcelStatus: 'created',
      previousDeliveryStatus: null,
      newDeliveryStatus: null,
    });
  });
});

describe('notifyOrganizationOfParcelEvent', () => {
  it('does not query for events that are not forwarded', async () => {
    const { notifyOrganizationOfParcelEvent } = await import('./notify.js');
    const query = vi.fn();
    await notifyOrganizationOfParcelEvent(
      { query } as never,
      {
        id: 'evt-1',
        parcelId: 'parcel-1',
        deliveryId: null,
        issueId: null,
        compartmentId: null,
        eventType: 'delivery.scanned',
        actorType: 'system',
        actorUserId: null,
        previousParcelStatus: null,
        newParcelStatus: null,
        previousDeliveryStatus: 'assigned',
        newDeliveryStatus: 'scanned',
        payload: {},
        createdAt: new Date(),
      },
    );
    expect(query).not.toHaveBeenCalled();
  });
});
