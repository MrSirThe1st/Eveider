'use client';

import { colors, typography } from '@eveider/config-ui';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import {
  formatRelativeTimeFr,
  type WebNotificationDto,
} from '@/lib/web-notification-presenter';

type ListResponse = {
  notifications: WebNotificationDto[];
  unreadCount: number;
};

export function NotificationsPageClient() {
  const [items, setItems] = useState<WebNotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<ListResponse>('/api/notifications?limit=100');
      setItems(data.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    try {
      await fetchJson('/api/notifications/read-all', { method: 'PATCH' });
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch {
      /* ignore */
    }
  }

  async function markOne(id: string) {
    try {
      await fetchJson(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return <p style={{ color: colors.textMuted }}>Chargement…</p>;
  }

  if (error) {
    return <p style={{ color: colors.textMuted }}>{error}</p>;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1rem',
        }}
      >
        <button
          type="button"
          onClick={() => void markAll()}
          style={{
            border: `1px solid ${colors.borderSubtle}`,
            background: colors.surface,
            borderRadius: 8,
            padding: '0.4rem 0.75rem',
            fontSize: 13,
            cursor: 'pointer',
            color: colors.secondary,
          }}
        >
          Tout marquer comme lu
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ color: colors.textMuted }}>Aucune notification pour le moment.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item) => {
            const body = (
              <div
                style={{
                  padding: '1rem 0',
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                  opacity: item.read ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <strong
                    style={{
                      fontSize: typography.body.fontSize,
                      fontWeight: item.read ? 500 : 650,
                    }}
                  >
                    {item.title}
                  </strong>
                  <span style={{ fontSize: 12, color: colors.textMuted }}>
                    {formatRelativeTimeFr(item.createdAt)}
                  </span>
                </div>
                <p style={{ margin: '0.35rem 0 0', color: colors.textMuted, fontSize: 14 }}>
                  {item.message}
                  {item.parcelReference ? ` · ${item.parcelReference}` : ''}
                </p>
              </div>
            );

            if (item.href) {
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    onClick={() => {
                      if (!item.read) void markOne(item.id);
                    }}
                  >
                    {body}
                  </Link>
                </li>
              );
            }

            return <li key={item.id}>{body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
