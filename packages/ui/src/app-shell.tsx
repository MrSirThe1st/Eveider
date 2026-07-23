'use client';

import { colors, radius, spacing, typography, borderSubtle } from '@eveider/config-ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './button.js';
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
const HEADER_HEIGHT = 56;

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
      <a href="#main-content" className="nb-skip-link">
        Aller au contenu
      </a>

      <aside
        aria-label="Navigation principale"
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
            padding: collapsed ? `${spacing[4]}px 0` : `${spacing[4]}px ${spacing[4]}px`,
            borderBottom: borderSubtle(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            minHeight: HEADER_HEIGHT,
            boxSizing: 'border-box',
          }}
        >
          {collapsed ? (
            <span
              style={{
                fontWeight: typography.weights.bold,
                fontSize: typography.caption.fontSize,
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
                  fontSize: typography.caption.fontSize,
                  fontWeight: typography.weights.medium,
                  lineHeight: typography.caption.lineHeight,
                  color: colors.textMuted,
                }}
              >
                Eveider
              </p>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.body.fontSize,
                  fontWeight: typography.weights.bold,
                  lineHeight: 1.3,
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
            padding: `${spacing[3]}px ${spacing[2]}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[1],
            overflowY: 'auto',
          }}
        >
          {navItems.map((item) => {
            const active = item.isActive ? item.isActive(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className="nb-nav-link"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  padding: collapsed ? `${spacing[3]}px 0` : `${spacing[3]}px ${spacing[3]}px`,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: radius.button,
                  textDecoration: 'none',
                  color: active ? colors.secondary : colors.textMuted,
                  background: active ? colors.surfaceSubtle : 'transparent',
                  fontWeight: active ? typography.weights.semibold : typography.weights.medium,
                  fontSize: typography.bodySm.fontSize,
                  lineHeight: 1.2,
                }}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: 3,
                      borderRadius: 2,
                      background: colors.primary,
                    }}
                  />
                ) : null}
                <span
                  style={{
                    display: 'flex',
                    flexShrink: 0,
                    opacity: active ? 1 : 0.75,
                    color: active ? colors.secondary : 'inherit',
                  }}
                >
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
            height: HEADER_HEIGHT,
            flexShrink: 0,
            background: colors.surface,
            borderBottom: borderSubtle(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${spacing[5]}px`,
            gap: spacing[4],
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
            aria-expanded={!collapsed}
            className="nb-shell-icon-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: spacing.buttonHeightSm,
              height: spacing.buttonHeightSm,
              border: borderSubtle(),
              borderRadius: radius.button,
              background: 'transparent',
              color: colors.secondary,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>

          <Button variant="secondary" size="sm" onClick={() => void onSignOut()}>
            {signOutLabel}
          </Button>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            width: '100%',
            maxWidth,
            margin: '0 auto',
            padding: `${spacing[7]}px ${spacing[6]}px ${spacing[12]}px`,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
