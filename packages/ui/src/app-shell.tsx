'use client';

import { colors, radius, borderSubtle, borderStrong, borders } from '@eveider/config-ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from './icons.js';

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive?: (pathname: string) => boolean;
};

export type AppShellProps = {
  brand: string;
  brandShort?: string;
  navItems: NavItem[];
  onSignOut: () => void | Promise<void>;
  signOutLabel?: string;
  children: ReactNode;
  maxWidth?: number;
  storageKey?: string;
};

const SIDEBAR_EXPANDED = 248;
const SIDEBAR_COLLAPSED = 72;

export function AppShell({
  brand,
  brandShort = 'EV',
  navItems,
  onSignOut,
  signOutLabel = 'Déconnexion',
  children,
  maxWidth = 1200,
  storageKey = 'eveider-sidebar-collapsed',
}: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === '1') setCollapsed(true);
    } catch {
      // ignore
    }
    setReady(true);
  }, [storageKey]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div
      className="portal-shell"
      style={{
        minHeight: '100vh',
        background: colors.background,
        display: 'flex',
        opacity: ready ? 1 : 0.98,
      }}
    >
      <aside
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          background: colors.surface,
          borderRight: borderSubtle(),
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          transition: 'width 200ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: collapsed ? '1.25rem 0' : '1.25rem 1rem',
            borderBottom: borderSubtle(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            minHeight: 56,
          }}
        >
          {collapsed ? (
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.8125rem',
                color: colors.secondary,
              }}
            >
              {brandShort}
            </span>
          ) : (
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: colors.textMuted,
                }}
              >
                Eveider
              </p>
              <p
                style={{
                  margin: '0.15rem 0 0',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: colors.secondary,
                }}
              >
                {brand}
              </p>
            </div>
          )}
        </div>

        <nav
          style={{
            flex: 1,
            padding: '0.75rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          {navItems.map((item) => {
            const active = item.isActive ? item.isActive(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: collapsed ? '0.75rem 0' : '0.75rem 0.875rem',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: radius.button,
                  textDecoration: 'none',
                  color: active ? '#FFFFFF' : colors.secondary,
                  background: active ? colors.primary : 'transparent',
                  border: 'none',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ display: 'flex', flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                  {item.icon}
                </span>
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            height: 56,
            flexShrink: 0,
            background: colors.surface,
            borderBottom: borderSubtle(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.25rem',
            gap: '1rem',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              border: borderSubtle(),
              borderRadius: radius.button,
              background: 'transparent',
              color: colors.secondary,
              cursor: 'pointer',
            }}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="nb-btn nb-btn-secondary"
            style={{
              height: 36,
              fontSize: '0.8125rem',
              padding: '0 0.875rem',
            }}
          >
            {signOutLabel}
          </button>
        </header>

        <main
          style={{
            flex: 1,
            width: '100%',
            maxWidth: maxWidth,
            margin: '0 auto',
            padding: '1.75rem 1.5rem 3rem',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
