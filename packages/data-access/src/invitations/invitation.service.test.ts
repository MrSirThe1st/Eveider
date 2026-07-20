import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordInviteDelivery, sendInvitation } from './invitation.service.js';

describe('sendInvitation', () => {
  const originalEnv = process.env;
  const fetchMock = vi.fn();
  const notificationCreate = vi.fn();

  const db = {
    notification: { create: notificationCreate },
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INVITE_WEB_BASE_URL: 'https://www.eveider.com',
      INVITE_DEEP_LINK_SCHEME: 'eveider',
    };
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.clearAllMocks();
    notificationCreate.mockResolvedValue({});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('falls back to simulated delivery when WhatsApp is not configured', async () => {
    const result = await sendInvitation({
      token: 'abc-123',
      phone: '+243800000000',
      businessName: 'Boutique Kin',
      parcelReference: 'PK-001',
    });

    expect(result).toMatchObject({
      channel: 'simulated',
      ok: true,
      webLink: 'https://www.eveider.com/invite/abc-123',
      deepLink: 'eveider://invite/abc-123',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends invite template with business name and web link', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
    process.env.WHATSAPP_PARCEL_INVITE_TEMPLATE = 'eveider_parcel_invite';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.invite' }] }),
    });

    const result = await sendInvitation({
      token: 'abc-123',
      phone: '+243800000000',
      businessName: 'Boutique Kin',
      parcelReference: 'PK-001',
    });

    expect(result).toMatchObject({
      channel: 'whatsapp',
      ok: true,
      templateName: 'eveider_parcel_invite',
      message: 'Boutique Kin · https://www.eveider.com/invite/abc-123',
    });

    const firstCall = fetchMock.mock.calls[0];
    const body = JSON.parse((firstCall![1] as RequestInit).body as string);
    expect(body.template.name).toBe('eveider_parcel_invite');
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'Boutique Kin',
      'https://www.eveider.com/invite/abc-123',
    ]);
  });

  it('records failed WhatsApp delivery without sentAt', async () => {
    await recordInviteDelivery(db as never, 'parcel-1', {
      channel: 'whatsapp',
      templateName: 'eveider_parcel_invite',
      deepLink: 'eveider://invite/abc-123',
      webLink: 'https://www.eveider.com/invite/abc-123',
      message: 'Template not approved',
      ok: false,
    });

    expect(notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        parcelId: 'parcel-1',
        channel: 'sms',
        message: '[whatsapp:eveider_parcel_invite] FAILED Template not approved',
        sentAt: null,
      }),
    });
  });
});
