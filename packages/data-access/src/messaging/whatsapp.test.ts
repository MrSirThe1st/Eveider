import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeWhatsAppPhone, getWhatsAppConfig } from './whatsapp-config.js';
import { sendWhatsAppTemplate } from './whatsapp-client.js';
import { sendParcelStatusWhatsApp } from './parcel-whatsapp.js';

describe('whatsapp-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('normalizes phone numbers to digits only', () => {
    expect(normalizeWhatsAppPhone('+243 800 000 000')).toBe('243800000000');
  });

  it('returns null when credentials are missing', () => {
    expect(getWhatsAppConfig()).toBeNull();
  });

  it('reads config from env', () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.WHATSAPP_PARCEL_IN_TRANSIT_TEMPLATE = 'eveider_parcel_in_transit';

    expect(getWhatsAppConfig()).toMatchObject({
      accessToken: 'token',
      phoneNumberId: '123',
      inTransitTemplate: 'eveider_parcel_in_transit',
    });
  });
});

describe('sendWhatsAppTemplate', () => {
  const originalEnv = process.env;
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_ACCESS_TOKEN: 'token',
      WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
      WHATSAPP_API_VERSION: 'v22.0',
      WHATSAPP_TEMPLATE_LANGUAGE: 'fr',
    };
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('posts a template message to Graph API', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.123' }] }),
    });

    const result = await sendWhatsAppTemplate({
      to: '+243800000000',
      templateName: 'eveider_parcel_in_transit',
      bodyParams: ['Marc', 'PK-001', 'Boutique', 'GOMBE'],
    });

    expect(result).toEqual({ ok: true, messageId: 'wamid.123' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v22.0/phone-id/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      }),
    );
  });
});

describe('sendParcelStatusWhatsApp', () => {
  const originalEnv = process.env;
  const fetchMock = vi.fn();
  const parcelFindUnique = vi.fn();
  const notificationFindFirst = vi.fn();
  const notificationCreate = vi.fn();

  const db = {
    parcel: { findUnique: parcelFindUnique },
    notification: {
      findFirst: notificationFindFirst,
      create: notificationCreate,
    },
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_ACCESS_TOKEN: 'token',
      WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
      WHATSAPP_PARCEL_IN_TRANSIT_TEMPLATE: 'eveider_parcel_in_transit',
      WHATSAPP_PARCEL_ARRIVED_TEMPLATE: 'eveider_parcel_arrived',
      WHATSAPP_TEMPLATE_LANGUAGE: 'fr',
    };
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('sends in-transit template with expected body params', async () => {
    parcelFindUnique.mockResolvedValue({
      id: 'parcel-1',
      reference: 'PK-001',
      recipientPhone: '+243800000000',
      recipientName: 'Marc',
      customerId: 'user-1',
      business: { name: 'Boutique Kin' },
      locker: { name: 'GOMBE', address: 'Ave 1' },
      pickupPin: null,
    });
    notificationFindFirst.mockResolvedValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.1' }] }),
    });

    await sendParcelStatusWhatsApp(db as never, 'parcel-1', 'in_transit');

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const body = JSON.parse((firstCall![1] as RequestInit).body as string);
    expect(body.template.name).toBe('eveider_parcel_in_transit');
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'Marc',
      'PK-001',
      'Boutique Kin',
      'GOMBE',
    ]);
    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'sms',
          message: expect.stringContaining('[whatsapp:eveider_parcel_in_transit]'),
        }),
      }),
    );
  });

  it('sends arrived template with app pickup link', async () => {
    process.env.INVITE_WEB_BASE_URL = 'https://www.eveider.com';
    parcelFindUnique.mockResolvedValue({
      id: 'parcel-1',
      reference: 'PK-001',
      recipientPhone: '+243800000000',
      recipientName: 'Marc',
      customerId: null,
      business: { name: 'Boutique Kin' },
      locker: { name: 'GOMBE', address: 'Ave 1' },
      invite: { token: 'abc-123' },
    });
    notificationFindFirst.mockResolvedValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.2' }] }),
    });

    await sendParcelStatusWhatsApp(db as never, 'parcel-1', 'ready_for_pickup');

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const body = JSON.parse((firstCall![1] as RequestInit).body as string);
    expect(body.template.name).toBe('eveider_parcel_arrived');
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'Marc',
      'PK-001',
      'GOMBE',
      'https://www.eveider.com/invite/abc-123',
    ]);
  });
});
