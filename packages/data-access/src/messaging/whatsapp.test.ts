import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSqlMatchMock,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
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
    process.env.WHATSAPP_PARCEL_INVITE_TEMPLATE = 'eveider_parcel_invite';

    expect(getWhatsAppConfig()).toMatchObject({
      accessToken: 'token',
      phoneNumberId: '123',
      inTransitTemplate: 'eveider_parcel_in_transit',
      inviteTemplate: 'eveider_parcel_invite',
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
    const inserts: unknown[][] = [];
    const db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'JOIN businesses')) {
        return {
          ...parcelRow({
            recipient_phone: '+243800000000',
            recipient_name: 'Marc',
            customer_id: 'user-1',
            reference: 'PK-001',
          }),
          business_name: 'Boutique Kin',
          locker_name: 'GOMBE',
          locker_address: 'Ave 1',
          invite_token: null,
        };
      }
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, "channel = 'sms'")) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        inserts.push(values ?? []);
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.1' }] }),
    });

    await sendParcelStatusWhatsApp(db, 'parcel-1', 'in_transit');

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
    expect(inserts).toHaveLength(1);
    expect(String(inserts[0]?.[2])).toContain('[whatsapp:eveider_parcel_in_transit]');
  });

  it('sends arrived template with app pickup link', async () => {
    process.env.INVITE_WEB_BASE_URL = 'https://www.eveider.com';
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM parcels p') && sqlIncludes(sql, 'JOIN businesses')) {
        return {
          ...parcelRow({
            recipient_phone: '+243800000000',
            recipient_name: 'Marc',
            customer_id: null,
            reference: 'PK-001',
          }),
          business_name: 'Boutique Kin',
          locker_name: 'GOMBE',
          locker_address: 'Ave 1',
          invite_token: 'abc-123',
        };
      }
      if (sqlIncludes(sql, 'FROM notifications') && sqlIncludes(sql, "channel = 'sms'")) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO notifications')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.2' }] }),
    });

    await sendParcelStatusWhatsApp(db, 'parcel-1', 'ready_for_pickup');

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const body = JSON.parse((firstCall![1] as RequestInit).body as string);
    expect(body.template.name).toBe('eveider_parcel_arrived');
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'Marc',
      'PK-001',
      'GOMBE',
      'https://www.eveider.com/suivi?ref=PK-001&phone=%2B243800000000',
    ]);
  });
});
