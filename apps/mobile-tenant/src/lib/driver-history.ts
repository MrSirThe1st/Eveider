import type { CourierDelivery } from './api';
import {
  getDriverDestination,
  getDriverMovementLabel,
  getDriverOrigin,
  getDriverTrackingLabel,
  isCustomerReturnJob,
  isHistoricalRts,
  isHistoryDriverDelivery,
} from './driver-presentation';

export type HistoryPeriod = 'today' | '7' | '30' | '90';
export type HistoryTypeFilter = 'all' | 'collect' | 'deposit' | 'return';
export type HistoryStatusFilter = 'all' | 'completed' | 'failed';

export type HistoryDayGroup = {
  key: string;
  label: string;
  count: number;
  items: CourierDelivery[];
};

export type HistorySummary = {
  daysLabel: HistoryPeriod;
  completed: number;
  failed: number;
  successRate: number;
};

export type DriverPeriodStats = HistorySummary & {
  total: number;
  collects: number;
  deposits: number;
  returns: number;
};

export type DriverActivityPoint = {
  key: string;
  label: string;
  completed: number;
  failed: number;
  total: number;
};

export type DriverTypeShare = {
  key: Exclude<HistoryTypeFilter, 'all'>;
  count: number;
  share: number;
};

const PERIOD_DAYS: Record<Exclude<HistoryPeriod, 'today'>, number> = {
  '7': 7,
  '30': 30,
  '90': 90,
};

export function historyEventAt(delivery: CourierDelivery): string {
  return delivery.completedAt ?? delivery.updatedAt;
}

export function getHistoryType(delivery: CourierDelivery): Exclude<HistoryTypeFilter, 'all'> {
  if (isCustomerReturnJob(delivery) || isHistoricalRts(delivery)) return 'return';
  // Outbound that never left pickup is a collecte; otherwise the lasting act is dépôt.
  if (delivery.status === 'failed' && !delivery.scannedAt) return 'collect';
  return 'deposit';
}

export function getHistoryStatusLabel(delivery: CourierDelivery): string {
  if (delivery.status === 'failed') return 'Incident';
  if (isHistoricalRts(delivery)) return 'Non retiré';
  if (isCustomerReturnJob(delivery) && delivery.status === 'completed') return 'Retour remis';
  if (delivery.status === 'completed') return 'Terminé';
  return getDriverMovementLabel(delivery);
}

/** True when history status deserves emphasis (not the default Terminé). */
export function isExceptionalHistoryStatus(delivery: CourierDelivery): boolean {
  if (delivery.status === 'failed') return true;
  if (isHistoricalRts(delivery)) return true;
  return delivery.status !== 'completed';
}

/** Single type line for history rows — no “Dépôt · Dépôt au casier” duplication. */
export function getHistoryRowTitle(delivery: CourierDelivery): string {
  const type = getHistoryType(delivery);
  if (type === 'return') return 'RETOUR';
  if (type === 'collect') return 'COLLECTE';
  return 'DÉPÔT AU CASIER';
}

export function formatHistoryTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-CD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** Retrospective deadline note when a due_at existed. */
export function formatHistoryPlannedDeadline(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const plannedClock = new Intl.DateTimeFormat('fr-CD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(due);
  return `Prévu avant ${plannedClock}`;
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function periodStart(period: HistoryPeriod, now = new Date()): Date {
  if (period === 'today') return startOfLocalDay(now);
  const days = PERIOD_DAYS[period];
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return start;
}

export function filterHistoryByPeriod(
  items: CourierDelivery[],
  period: HistoryPeriod,
  now = new Date(),
): CourierDelivery[] {
  const start = periodStart(period, now).getTime();
  return items.filter((item) => {
    if (!isHistoryDriverDelivery(item)) return false;
    return new Date(historyEventAt(item)).getTime() >= start;
  });
}

export function summarizeHistory(items: CourierDelivery[], period: HistoryPeriod): HistorySummary {
  let completed = 0;
  let failed = 0;
  for (const item of items) {
    if (item.status === 'completed') completed += 1;
    else if (item.status === 'failed') failed += 1;
  }
  const total = completed + failed;
  return {
    daysLabel: period,
    completed,
    failed,
    successRate: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function buildDriverPeriodStats(
  items: CourierDelivery[],
  period: HistoryPeriod,
  now = new Date(),
): DriverPeriodStats {
  const periodItems = filterHistoryByPeriod(items, period, now);
  const summary = summarizeHistory(periodItems, period);
  let collects = 0;
  let deposits = 0;
  let returns = 0;
  for (const item of periodItems) {
    const type = getHistoryType(item);
    if (type === 'collect') collects += 1;
    else if (type === 'return') returns += 1;
    else deposits += 1;
  }
  return {
    ...summary,
    total: periodItems.length,
    collects,
    deposits,
    returns,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function dayBucketKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function shortDayLabel(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}

function weekdayLabel(date: Date, locale: 'fr' | 'en'): string {
  const fr = ['di', 'lu', 'ma', 'me', 'je', 've', 'sa'] as const;
  const en = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
  const labels = locale === 'en' ? en : fr;
  return labels[date.getDay()] ?? '';
}

function eachLocalDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfLocalDay(start);
  const last = startOfLocalDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Activity series for charts. Buckets:
 * - today: 6 × 4h slots
 * - 7 / 30: one bar per day
 * - 90: one bar per week (oldest → newest)
 */
export function buildDriverActivitySeries(
  items: CourierDelivery[],
  period: HistoryPeriod,
  now = new Date(),
  locale: 'fr' | 'en' = 'fr',
): DriverActivityPoint[] {
  const periodItems = filterHistoryByPeriod(items, period, now);

  if (period === 'today') {
    const dayStart = startOfLocalDay(now);
    const slots = Array.from({ length: 6 }, (_, index) => {
      const startHour = index * 4;
      const start = new Date(dayStart);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(startHour + 4, 0, 0, 0);
      return {
        key: `h${startHour}`,
        label: `${pad2(startHour)}h`,
        startMs: start.getTime(),
        endMs: end.getTime(),
        completed: 0,
        failed: 0,
      };
    });

    for (const item of periodItems) {
      const ms = new Date(historyEventAt(item)).getTime();
      const slot = slots.find((entry) => ms >= entry.startMs && ms < entry.endMs);
      if (!slot) continue;
      if (item.status === 'completed') slot.completed += 1;
      else if (item.status === 'failed') slot.failed += 1;
    }

    return slots.map(({ key, label, completed, failed }) => ({
      key,
      label,
      completed,
      failed,
      total: completed + failed,
    }));
  }

  if (period === '90') {
    const end = startOfLocalDay(now);
    const start = startOfLocalDay(periodStart(period, now));
    const weeks: DriverActivityPoint[] = [];
    const cursor = new Date(start);
    let weekIndex = 0;
    while (cursor.getTime() <= end.getTime()) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weeks.push({
        key: `w${weekIndex}`,
        label: shortDayLabel(weekStart),
        completed: 0,
        failed: 0,
        total: 0,
      });
      const bucket = weeks[weeks.length - 1]!;
      const startMs = weekStart.getTime();
      const endMs = Math.min(weekEnd.getTime(), end.getTime() + 86_400_000);
      for (const item of periodItems) {
        const ms = new Date(historyEventAt(item)).getTime();
        if (ms < startMs || ms >= endMs) continue;
        if (item.status === 'completed') bucket.completed += 1;
        else if (item.status === 'failed') bucket.failed += 1;
      }
      bucket.total = bucket.completed + bucket.failed;
      cursor.setDate(cursor.getDate() + 7);
      weekIndex += 1;
    }
    return weeks;
  }

  const end = startOfLocalDay(now);
  const start = startOfLocalDay(periodStart(period, now));
  const days = eachLocalDay(start, end);
  const buckets = new Map<string, DriverActivityPoint>();
  for (const day of days) {
    const key = dayBucketKey(day);
    buckets.set(key, {
      key,
      label: period === '7' ? weekdayLabel(day, locale) : shortDayLabel(day),
      completed: 0,
      failed: 0,
      total: 0,
    });
  }

  for (const item of periodItems) {
    const key = dayBucketKey(new Date(historyEventAt(item)));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (item.status === 'completed') bucket.completed += 1;
    else if (item.status === 'failed') bucket.failed += 1;
    bucket.total = bucket.completed + bucket.failed;
  }

  return [...buckets.values()];
}

export function buildDriverTypeShares(stats: DriverPeriodStats): DriverTypeShare[] {
  const total = stats.collects + stats.deposits + stats.returns;
  const rows: Array<{ key: DriverTypeShare['key']; count: number }> = [
    { key: 'collect', count: stats.collects },
    { key: 'deposit', count: stats.deposits },
    { key: 'return', count: stats.returns },
  ];
  return rows.map((row) => ({
    ...row,
    share: total === 0 ? 0 : Math.round((row.count / total) * 100),
  }));
}

export function filterHistoryDeliveries(
  items: CourierDelivery[],
  input: {
    period: HistoryPeriod;
    type: HistoryTypeFilter;
    status: HistoryStatusFilter;
    query: string;
    now?: Date;
  },
): CourierDelivery[] {
  const query = input.query.trim().toLowerCase();
  return filterHistoryByPeriod(items, input.period, input.now)
    .filter((item) => {
      if (input.type !== 'all' && getHistoryType(item) !== input.type) return false;
      if (input.status === 'completed' && item.status !== 'completed') return false;
      if (input.status === 'failed' && item.status !== 'failed') return false;
      if (!query) return true;
      return historySearchHaystack(item).includes(query);
    })
    .sort((a, b) => historyEventAt(b).localeCompare(historyEventAt(a)));
}

/** Search: tracking, business, locker/address, recipient — not free-form noise. */
export function historySearchHaystack(delivery: CourierDelivery): string {
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const locker = delivery.parcel.locker;
  return [
    getDriverTrackingLabel(delivery),
    delivery.parcel.trackingNumber,
    delivery.parcel.reference,
    delivery.parcel.businessName,
    delivery.parcel.recipientName,
    delivery.parcel.senderName,
    delivery.parcel.senderLocationName,
    delivery.parcel.senderAddress,
    locker?.name,
    locker?.address,
    origin.name,
    origin.address,
    destination.name,
    destination.address,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function dayKey(iso: string): string {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatHistoryDayLabel(iso: string, now = new Date()): string {
  const date = startOfLocalDay(new Date(iso));
  const today = startOfLocalDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Aujourd’hui';
  if (date.getTime() === yesterday.getTime()) return 'Hier';

  const raw = new Intl.DateTimeFormat('fr-CD', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatHistoryGroupHeading(
  iso: string,
  count: number,
  now = new Date(),
): string {
  return `${formatHistoryDayLabel(iso, now)} · ${count}`;
}

export function groupHistoryByDay(
  items: CourierDelivery[],
  now = new Date(),
): HistoryDayGroup[] {
  const groups = new Map<string, CourierDelivery[]>();
  for (const item of items) {
    const key = dayKey(historyEventAt(item));
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupItems]) => ({
      key,
      label: formatHistoryGroupHeading(historyEventAt(groupItems[0]!), groupItems.length, now),
      count: groupItems.length,
      items: groupItems,
    }));
}
