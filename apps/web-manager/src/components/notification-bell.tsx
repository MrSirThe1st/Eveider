'use client';

import { colors, radius, spacing, typography } from '@eveider/config-ui';
import { IconBell } from '@eveider/ui';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import {
  formatRelativeTimeFr,
  type WebNotificationDto,
} from '@/lib/web-notification-presenter';

const POLL_MS = 60_000;

type SummaryResponse = {
  unreadCount: number;
  badges: {
    admin?: {
      livraisons: number;
      organisations: number;
      flotte: number;
      incidents: number;
      awaitingAssignment: number;
      awaitingReturnAssignment: number;
    };
    business?: {
      colis: number;
      awaitingHandoff: number;
      awaitingDeposit: number;
      returnsToReview: number;
      returnsToCollect: number;
    };
  };
};

type ListResponse = {
  notifications: WebNotificationDto[];
  unreadCount: number;
};

export type OperationalBadgeSnapshot = SummaryResponse['badges'];

type NotificationBellProps = {
  allHref: string;
  onBadges?: (badges: OperationalBadgeSnapshot) => void;
};

export function NotificationBell({ allHref, onBadges }: NotificationBellProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<WebNotificationDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshSummary = useCallback(async () => {
    try {
      const data = await fetchJson<SummaryResponse>('/api/notifications/summary');
      setUnreadCount(data.unreadCount);
      onBadges?.(data.badges);
    } catch {
      /* ignore transient poll errors */
    }
  }, [onBadges]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<ListResponse>('/api/notifications?limit=12');
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSummary();
    const timer = window.setInterval(() => void refreshSummary(), POLL_MS);
    function onFocus() {
      void refreshSummary();
    }
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshSummary]);

  useEffect(() => {
    if (!open) return;
    void refreshList();
  }, [open, refreshList]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function markOne(id: string) {
    try {
      await fetchJson(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      /* ignore */
    }
  }

  async function markAll() {
    try {
      await fetchJson('/api/notifications/read-all', { method: 'PATCH' });
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="nb-top-bar__icon"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} non lues`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        style={{ position: 'relative' }}
      >
        <IconBell width={18} height={18} />
        {unreadCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              background: '#C43C2C',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 360,
            maxWidth: 'min(360px, calc(100vw - 24px))',
            maxHeight: 'min(480px, calc(100dvh - 80px))',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: colors.surface,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radius.lg,
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[3],
              padding: `${spacing[3]}px ${spacing[4]}px`,
              borderBottom: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <strong style={{ fontSize: typography.bodySm.fontSize }}>Notifications</strong>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAll()}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: colors.textMuted,
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Tout marquer comme lu
              </button>
            ) : null}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && items.length === 0 ? (
              <p style={{ margin: 0, padding: spacing[4], color: colors.textMuted, fontSize: 13 }}>
                Chargement…
              </p>
            ) : null}
            {!loading && items.length === 0 ? (
              <p style={{ margin: 0, padding: spacing[4], color: colors.textMuted, fontSize: 13 }}>
                Aucune notification pour le moment.
              </p>
            ) : null}
            {items.map((item) => {
              const content = (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: spacing[2],
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: item.read
                          ? typography.weights.medium
                          : typography.weights.semibold,
                        fontSize: typography.bodySm.fontSize,
                        color: colors.secondary,
                      }}
                    >
                      {item.title}
                    </span>
                    {!item.read ? (
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: '#C43C2C',
                          flexShrink: 0,
                          marginTop: 5,
                        }}
                      />
                    ) : null}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: colors.textMuted,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.message}
                    {item.parcelReference ? ` · ${item.parcelReference}` : ''}
                  </p>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 12,
                      color: colors.textMuted,
                    }}
                  >
                    {formatRelativeTimeFr(item.createdAt)}
                  </p>
                </>
              );

              const style = {
                display: 'block' as const,
                padding: `${spacing[3]}px ${spacing[4]}px`,
                borderBottom: `1px solid ${colors.borderSubtle}`,
                textDecoration: 'none' as const,
                background: item.read ? 'transparent' : 'rgba(15, 23, 42, 0.03)',
                color: 'inherit',
                cursor: 'pointer',
              };

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={style}
                    onClick={() => {
                      if (!item.read) void markOne(item.id);
                      setOpen(false);
                    }}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  style={{ ...style, width: '100%', textAlign: 'left', border: 'none' }}
                  onClick={() => {
                    if (!item.read) void markOne(item.id);
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>

          <div
            style={{
              padding: `${spacing[3]}px ${spacing[4]}px`,
              borderTop: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <Link
              href={allHref}
              onClick={() => setOpen(false)}
              style={{
                fontSize: 13,
                fontWeight: typography.weights.semibold,
                color: colors.secondary,
                textDecoration: 'none',
              }}
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
