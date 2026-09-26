import { describe, expect, it } from 'vitest';
import type { CourierDelivery } from './api';
import {
  buildDriverActivitySeries,
  buildDriverPeriodStats,
  buildDriverTypeShares,
  filterHistoryByPeriod,
  filterHistoryDeliveries,
  getHistoryType,
  groupHistoryByDay,
  summarizeHistory,
} from './driver-history';

function delivery(
  partial: Partial<CourierDelivery> & {
    id: string;
    status: CourierDelivery['status'];
  },
): CourierDelivery {
  return {
    statusLabel: partial.status,
    scannedAt: null,
    completedAt: null,
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
    hasDropOffPhoto: false,
    kind: 'outbound',
    kindLabel: 'Aller',
    parcel: {
      id: `p-${partial.id}`,
      trackingNumber: `EVD-${partial.id}`,
      reference: null,
      status: 'created',
      recipientName: 'Amina',
      businessName: 'Mulikap',
      senderAddress: 'Avenue Kapenda',
      senderLocationName: 'Mulikap',
      locker: {
        id: 'locker-1',
        name: 'Katuba',
        address: 'Katuba',
        latitude: -11.6,
        longitude: 27.4,
        status: 'active',
        statusLabel: 'Actif',
        canAcceptDropOff: true,
      },
      compartmentId: null,
      compartmentLabel: null,
      ...partial.parcel,
    },
    ...partial,
  };
}

describe('driver history filtering', () => {
  const now = new Date('2026-09-26T15:00:00.000Z');

  const items = [
    delivery({
      id: '1',
      status: 'completed',
      completedAt: '2026-09-26T10:00:00.000Z',
      scannedAt: '2026-09-26T09:00:00.000Z',
    }),
    delivery({
      id: '2',
      status: 'failed',
      updatedAt: '2026-09-25T12:00:00.000Z',
    }),
    delivery({
      id: '3',
      status: 'completed',
      kind: 'customer_return',
      completedAt: '2026-09-20T08:00:00.000Z',
      scannedAt: '2026-09-20T07:00:00.000Z',
    }),
    delivery({
      id: '4',
      status: 'completed',
      completedAt: '2026-08-01T08:00:00.000Z',
      scannedAt: '2026-08-01T07:00:00.000Z',
    }),
  ];

  it('filters by period relative to now', () => {
    expect(filterHistoryByPeriod(items, 'today', now).map((item) => item.id)).toEqual(['1']);
    expect(filterHistoryByPeriod(items, '7', now).map((item) => item.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(filterHistoryByPeriod(items, '90', now)).toHaveLength(4);
  });

  it('summarizes the selected period only', () => {
    const week = filterHistoryByPeriod(items, '7', now);
    expect(summarizeHistory(week, '7')).toEqual({
      daysLabel: '7',
      completed: 2,
      failed: 1,
      successRate: 67,
    });
  });

  it('builds period stats with type breakdown', () => {
    expect(buildDriverPeriodStats(items, '7', now)).toEqual({
      daysLabel: '7',
      completed: 2,
      failed: 1,
      successRate: 67,
      total: 3,
      collects: 1,
      deposits: 1,
      returns: 1,
    });
  });

  it('classifies collect / deposit / return', () => {
    expect(getHistoryType(items[0]!)).toBe('deposit');
    expect(getHistoryType(items[1]!)).toBe('collect');
    expect(getHistoryType(items[2]!)).toBe('return');
  });

  it('applies type, status and search together', () => {
    const filtered = filterHistoryDeliveries(items, {
      period: '90',
      type: 'return',
      status: 'completed',
      query: 'mulikap',
      now,
    });
    expect(filtered.map((item) => item.id)).toEqual(['3']);
  });

  it('groups by day with newest first', () => {
    const groups = groupHistoryByDay(filterHistoryByPeriod(items, '7', now), now);
    expect(groups[0]?.label).toBe('Aujourd’hui · 1');
    expect(groups[0]?.count).toBe(1);
    expect(groups[1]?.label).toBe('Hier · 1');
  });

  it('searches tracking, business and locker address', () => {
    const byTracking = filterHistoryDeliveries(items, {
      period: '90',
      type: 'all',
      status: 'all',
      query: 'EVD-1',
      now,
    });
    expect(byTracking.map((item) => item.id)).toEqual(['1']);

    const byLocker = filterHistoryDeliveries(items, {
      period: '90',
      type: 'all',
      status: 'all',
      query: 'katuba',
      now,
    });
    expect(byLocker.map((item) => item.id).sort()).toEqual(['1', '2', '3', '4']);
  });

  it('builds a daily activity series for 7 days', () => {
    const series = buildDriverActivitySeries(items, '7', now, 'fr');
    expect(series.length).toBeGreaterThanOrEqual(7);
    const today = series[series.length - 1];
    expect(today?.completed).toBe(1);
    expect(series.reduce((sum, point) => sum + point.total, 0)).toBe(3);
  });

  it('builds type shares from period stats', () => {
    const stats = buildDriverPeriodStats(items, '7', now);
    expect(buildDriverTypeShares(stats)).toEqual([
      { key: 'collect', count: 1, share: 33 },
      { key: 'deposit', count: 1, share: 33 },
      { key: 'return', count: 1, share: 33 },
    ]);
  });
});
