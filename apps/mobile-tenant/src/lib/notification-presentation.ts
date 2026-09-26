import type { CustomerNotification } from './api';

export type NotificationIcon = 'truck' | 'package' | 'check' | 'rotate-ccw' | 'alert-circle' | 'bell';

export type PresentedNotification = {
  title: string;
  context?: string;
  detail?: string;
  icon: NotificationIcon;
};

export type NotificationDayGroup = {
  key: 'today' | 'yesterday' | 'week' | 'earlier';
  label: string;
  items: CustomerNotification[];
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function lockerRouteLabel(locker: string): string {
  const name = locker.trim();
  if (!name) return name;
  if (/^eveider\b/i.test(name) || /^casier\b/i.test(name)) {
    return name.replace(/^Casier\s+/i, '');
  }
  return `Eveider ${name}`;
}

/** Split dense backend copy into title / context / detail for inbox scanning. */
export function presentNotification(item: CustomerNotification): PresentedNotification {
  const title = (item.title?.trim() || fallbackTitle(item.type)).replace(/^Nouvelle livraison$/i, 'Nouvelle collecte');
  const icon = iconForType(item.type, title);
  const tracking = item.parcelTrackingNumber?.trim() || item.parcelReference?.trim() || null;
  const parsed = presentNotificationBody(item.message, tracking);
  return { title, icon, ...parsed };
}

export function presentNotificationBody(
  message: string,
  tracking?: string | null,
): { context?: string; detail?: string } {
  const raw = message.trim();
  if (!raw) {
    return tracking ? { detail: tracking } : {};
  }

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return {
      context: lines[0],
      detail: lines.slice(1).join(' '),
    };
  }

  const collect = raw.match(
    /^Collecte chez\s+(.+?)(?:\s*·\s*([^·]+?))?\s*·\s*(1 colis[^.]*)\.?$/i,
  );
  if (collect) {
    const business = collect[1]!.trim();
    const locker = collect[2]?.trim();
    const detail = collect[3]!.trim();
    return {
      context: locker ? `${business} → ${lockerRouteLabel(locker)}` : business,
      detail,
    };
  }

  const parts = raw
    .replace(/\.$/, '')
    .split(/\s*·\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      context: parts[0],
      detail: parts.slice(1).join(' · '),
    };
  }

  if (tracking && raw.toLowerCase() !== tracking.toLowerCase()) {
    return { context: raw.replace(/\.$/, ''), detail: tracking };
  }

  return { context: raw.replace(/\.$/, '') };
}

function fallbackTitle(type: string | null): string {
  if (!type) return 'Notification';
  if (type === 'delivery.assigned') return 'Nouvelle collecte';
  if (type === 'return.assigned') return 'Nouveau retour';
  if (type === 'locker.blocked') return 'Casier indisponible';
  if (type.startsWith('parcel.') && type.includes('collected')) return 'Livraison terminée';
  return 'Notification';
}

function iconForType(type: string | null, title: string): NotificationIcon {
  const value = `${type ?? ''} ${title}`.toLowerCase();
  if (value.includes('locker') || value.includes('casier indisponible')) return 'alert-circle';
  if (value.includes('return') || value.includes('retour')) return 'rotate-ccw';
  if (
    value.includes('completed') ||
    value.includes('terminé') ||
    value.includes('collected') ||
    value.includes('confirmé')
  ) {
    return 'check';
  }
  if (value.includes('collecte') || value.includes('livraison') || value.includes('assigned')) {
    return 'truck';
  }
  if (value.includes('parcel') || value.includes('colis')) return 'package';
  return 'bell';
}

export function groupNotificationsByRecency(
  items: CustomerNotification[],
  labels: { today: string; yesterday: string; week: string; earlier: string },
  now = new Date(),
): NotificationDayGroup[] {
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  const weekStart = today - 6 * 86_400_000;

  const buckets: NotificationDayGroup[] = [
    { key: 'today', label: labels.today, items: [] },
    { key: 'yesterday', label: labels.yesterday, items: [] },
    { key: 'week', label: labels.week, items: [] },
    { key: 'earlier', label: labels.earlier, items: [] },
  ];

  for (const item of items) {
    const day = startOfDay(new Date(item.createdAt));
    if (day === today) buckets[0]!.items.push(item);
    else if (day === yesterday) buckets[1]!.items.push(item);
    else if (day >= weekStart) buckets[2]!.items.push(item);
    else buckets[3]!.items.push(item);
  }

  return buckets.filter((group) => group.items.length > 0);
}

/** Hermes has never supported Intl.RelativeTimeFormat — avoid it on native. */
export function formatNotificationRelativeTime(iso: string, locale: string): string {
  const en = locale.startsWith('en');
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));

  if (minutes < 1) return en ? 'Just now' : 'À l’instant';
  if (minutes < 60) {
    return en ? `${minutes} min ago` : `Il y a ${minutes} min`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return en ? `${hours}h ago` : `Il y a ${hours} h`;
  }
  const days = Math.round(hours / 24);
  if (en) {
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }
  return days === 1 ? 'Hier' : `Il y a ${days} j`;
}
