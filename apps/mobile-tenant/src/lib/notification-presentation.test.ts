import { describe, expect, it } from 'vitest';
import type { CustomerNotification } from './api';
import {
  formatNotificationRelativeTime,
  groupNotificationsByRecency,
  presentNotification,
  presentNotificationBody,
} from './notification-presentation';

function item(
  partial: Partial<CustomerNotification> & { id: string; message: string },
): CustomerNotification {
  return {
    type: 'delivery.assigned',
    title: 'Nouvelle livraison',
    read: false,
    parcelId: null,
    parcelReference: null,
    parcelTrackingNumber: null,
    entityType: 'delivery',
    entityId: null,
    deliveryId: null,
    createdAt: '2026-09-26T12:00:00.000Z',
    ...partial,
  };
}

describe('notification presentation', () => {
  it('splits legacy assignment copy into route + detail', () => {
    expect(
      presentNotificationBody('Collecte chez Boutique Kenya · KENYA · 1 colis à récupérer.'),
    ).toEqual({
      context: 'Boutique Kenya → Eveider KENYA',
      detail: '1 colis à récupérer',
    });
  });

  it('uses multiline messages as context + detail', () => {
    expect(
      presentNotificationBody('Boutique Kenya → Eveider Katuba\n1 colis à récupérer'),
    ).toEqual({
      context: 'Boutique Kenya → Eveider Katuba',
      detail: '1 colis à récupérer',
    });
  });

  it('renames Nouvelle livraison to Nouvelle collecte for display', () => {
    const presented = presentNotification(
      item({
        id: '1',
        title: 'Nouvelle livraison',
        message: 'Collecte chez Boutique Kenya · Katuba · 1 colis à récupérer.',
      }),
    );
    expect(presented.title).toBe('Nouvelle collecte');
    expect(presented.icon).toBe('truck');
    expect(presented.context).toContain('Boutique Kenya');
  });

  it('groups today / yesterday / this week / earlier', () => {
    const now = new Date('2026-09-26T15:00:00.000Z');
    const groups = groupNotificationsByRecency(
      [
        item({ id: '1', message: 'a', createdAt: '2026-09-26T10:00:00.000Z' }),
        item({ id: '2', message: 'b', createdAt: '2026-09-25T10:00:00.000Z' }),
        item({ id: '3', message: 'c', createdAt: '2026-09-23T10:00:00.000Z' }),
        item({ id: '4', message: 'd', createdAt: '2026-09-01T10:00:00.000Z' }),
      ],
      {
        today: 'Aujourd’hui',
        yesterday: 'Hier',
        week: 'Cette semaine',
        earlier: 'Plus tôt',
      },
      now,
    );
    expect(groups.map((group) => group.key)).toEqual(['today', 'yesterday', 'week', 'earlier']);
  });

  it('capitalizes relative french time', () => {
    const recent = new Date(Date.now() - 27 * 60_000).toISOString();
    expect(formatNotificationRelativeTime(recent, 'fr')).toMatch(/^Il y a 2[67] min$/);
  });
});
