'use client';

import { colors } from '@eveider/config-ui';
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
  signOutLabel = 'DÉCONNEXION',
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
      style={{
        minHeight: '100vh',
        background: colors.background,
        display: 'flex',
        opacity: ready ? 1 : 0.98,
        transition: 'opacity 120ms ease',
      }}
    >
      <aside
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          background: colors.surface,
          borderRight: `1px solid ${colors.border}`,
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
            borderBottom: `1px solid ${colors.border}`,
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
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
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
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: colors.secondary,
                  opacity: 0.65,
                }}
              >
                EVEIDER
              </p>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
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
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: colors.secondary,
                  background: active ? 'rgba(9, 212, 11, 0.14)' : 'transparent',
                  fontWeight: active ? 700 : 600,
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  transition: 'background 150ms ease',
                }}
              >
                <span style={{ display: 'flex', flexShrink: 0, opacity: active ? 1 : 0.72 }}>
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
            borderBottom: `1px solid ${colors.border}`,
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
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              background: colors.background,
              color: colors.secondary,
              cursor: 'pointer',
            }}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              background: colors.surface,
              fontWeight: 600,
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              color: colors.secondary,
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
