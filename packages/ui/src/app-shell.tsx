'use client';

import { colors, radius, spacing, typography, borderSubtle } from '@eveider/config-ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronLeft, IconChevronRight, IconLogOut, IconMenu, IconSettings, IconX } from './icons.js';

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Optional active matcher (pathname + search string, e.g. "?status=assigned"). */
  isActive?: (pathname: string, search: string) => boolean;
};

export type NavModule = {
  id: string;
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  icon?: ReactNode;
};

export type AppShellProps = {
  brand: string;
  brandShort?: string;
  modules: NavModule[];
  onSignOut: () => void | Promise<void>;
  signOutLabel?: string;
  children: ReactNode;
  profileHref?: string;
  profileLabel?: string;
  toolbar?: ReactNode;
};

const SIDEBAR_COLLAPSED_KEY = 'eveider.shell.sidebarCollapsed';
const CHROME_HEIGHT = 56;
const NAV_TOOLTIP_DELAY_MS = 120;
const DESKTOP_NAV_MQ = '(min-width: 720px)';

type NavTooltipState = {
  label: string;
  top: number;
  left: number;
};

function isDesktopNav() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_NAV_MQ).matches;
}

function SidebarNavTooltip({ tooltip }: { tooltip: NavTooltipState | null }) {
  if (!tooltip || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="tooltip"
      className="nb-side-nav__tooltip"
      style={{
        position: 'fixed',
        top: tooltip.top,
        left: tooltip.left,
        transform: 'translateY(-50%)',
        zIndex: 80,
        pointerEvents: 'none',
        padding: '6px 10px',
        background: colors.secondary,
        color: colors.surface,
        fontFamily: typography.fontFamily,
        fontSize: typography.caption.fontSize,
        fontWeight: typography.weights.semibold,
        lineHeight: 1.2,
        borderRadius: radius.sm,
        boxShadow: '0 4px 12px rgba(16, 24, 40, 0.16)',
        whiteSpace: 'nowrap',
      }}
    >
      {tooltip.label}
    </div>,
    document.body,
  );
}

/**
 * Portal chrome: full-height module sidebar + sticky top bar (account actions).
 */
export function AppShell({
  brand,
  brandShort = 'EV',
  modules,
  onSignOut,
  signOutLabel = 'Se déconnecter',
  children,
  profileHref,
  profileLabel,
  toolbar,
}: AppShellProps) {
  const pathname = usePathname();
  const activeModule = modules.find((mod) => mod.match(pathname)) ?? null;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navTooltip, setNavTooltip] = useState<NavTooltipState | null>(null);
  const navTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarId = useId();

  function clearNavTooltipTimer() {
    if (navTooltipTimer.current != null) {
      clearTimeout(navTooltipTimer.current);
      navTooltipTimer.current = null;
    }
  }

  function hideNavTooltip() {
    clearNavTooltipTimer();
    setNavTooltip(null);
  }

  function scheduleNavTooltip(target: HTMLElement, label: string) {
    if (!collapsed || !isDesktopNav()) return;
    const rect = target.getBoundingClientRect();
    const next: NavTooltipState = {
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    };
    clearNavTooltipTimer();
    navTooltipTimer.current = setTimeout(() => setNavTooltip(next), NAV_TOOLTIP_DELAY_MS);
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === '1') setCollapsed(true);
      else if (stored === '0') setCollapsed(false);
      else setCollapsed(window.matchMedia('(max-width: 1023px)').matches);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    hideNavTooltip();
  }, [pathname]);

  useEffect(() => {
    hideNavTooltip();
  }, [collapsed]);

  useEffect(() => {
    return () => clearNavTooltipTimer();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const shellClass = [
    'portal-shell',
    collapsed ? 'portal-shell--collapsed' : null,
    mobileOpen ? 'portal-shell--nav-open' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={shellClass}
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        background: colors.background,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        overflow: 'hidden',
      }}
    >
      <a href="#main-content" className="nb-skip-link">
        Aller au contenu
      </a>

      <button
        type="button"
        className="nb-sidebar-backdrop"
        aria-label="Fermer le menu"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        id={sidebarId}
        className="nb-sidebar"
        aria-label="Navigation principale"
        style={{
          alignSelf: 'stretch',
          flexShrink: 0,
          background: colors.surface,
          borderRight: borderSubtle(),
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="nb-sidebar-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[1],
            minHeight: CHROME_HEIGHT,
            paddingLeft: spacing[3],
            paddingRight: spacing[2],
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <div
            className="nb-sidebar-brand"
            aria-label={`Eveider ${brand}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              minWidth: 0,
              flex: 1,
            }}
          >
            <img
              src="/landing/eveider_logo.png"
              alt=""
              width={36}
              height={36}
              className="nb-sidebar-logo"
              style={{
                display: 'block',
                width: 36,
                height: 36,
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <span
              className="nb-side-nav__label"
              aria-hidden
              style={{
                color: colors.textMuted,
                fontSize: typography.bodySm.fontSize,
                fontWeight: typography.weights.medium,
                lineHeight: 1,
              }}
            >
              /
            </span>
            <span
              className="nb-side-nav__label"
              style={{
                fontSize: typography.bodySm.fontSize,
                fontWeight: typography.weights.semibold,
                color: colors.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={brand}
            >
              {brandShort}
            </span>
          </div>

          <button
            type="button"
            className="nb-sidebar-collapse"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              padding: 0,
              border: 'none',
              borderRadius: radius.sm,
              background: 'transparent',
              color: colors.textMuted,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {collapsed ? (
              <IconChevronRight width={16} height={16} />
            ) : (
              <IconChevronLeft width={16} height={16} />
            )}
          </button>
        </div>

        <nav
          className="nb-side-nav"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[1],
            flex: 1,
            overflowY: 'auto',
            padding: `${spacing[4]}px ${spacing[3]}px`,
          }}
        >
            {modules.map((mod) => {
              const active = activeModule?.id === mod.id;
              return (
                <Link
                  key={mod.id}
                  href={mod.href}
                  className="nb-side-nav__link"
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed ? mod.label : undefined}
                  onClick={() => {
                    setMobileOpen(false);
                    hideNavTooltip();
                  }}
                  onMouseEnter={(event) => scheduleNavTooltip(event.currentTarget, mod.label)}
                  onMouseLeave={hideNavTooltip}
                  onFocus={(event) => scheduleNavTooltip(event.currentTarget, mod.label)}
                  onBlur={hideNavTooltip}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    padding: `${spacing[2] + 2}px ${spacing[3]}px`,
                    borderRadius: radius.md,
                    textDecoration: 'none',
                    fontSize: typography.bodySm.fontSize,
                    fontWeight: active ? typography.weights.semibold : typography.weights.medium,
                    color: active ? colors.secondary : colors.textMuted,
                    background: active ? colors.successMuted : 'transparent',
                    minHeight: 40,
                  }}
                >
                  {mod.icon ? (
                    <span
                      aria-hidden
                      className="nb-side-nav__icon"
                      style={{
                        display: 'inline-flex',
                        flexShrink: 0,
                        color: active ? colors.primary : colors.textMuted,
                      }}
                    >
                      {mod.icon}
                    </span>
                  ) : null}
                  <span className="nb-side-nav__label">{mod.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div
          className="portal-main"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <header
            className="nb-top-bar"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 30,
              height: CHROME_HEIGHT,
              flexShrink: 0,
              background: colors.surface,
              borderBottom: borderSubtle(),
              display: 'flex',
              alignItems: 'center',
              gap: spacing[3],
              paddingLeft: spacing[4],
              paddingRight: spacing[5],
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              className="nb-menu-button"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
              aria-controls={sidebarId}
              onClick={() => setMobileOpen((open) => !open)}
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                padding: 0,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: radius.md,
                background: colors.surface,
                color: colors.secondary,
                cursor: 'pointer',
              }}
            >
              {mobileOpen ? <IconX width={20} height={20} /> : <IconMenu width={20} height={20} />}
            </button>

            <div style={{ flex: 1 }} />

            <div className="nb-top-bar__actions">
              {toolbar}
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="nb-top-bar__icon"
                  aria-label={profileLabel ?? 'Paramètres'}
                  title={profileLabel ?? 'Paramètres'}
                >
                  <IconSettings width={18} height={18} />
                </Link>
              ) : null}
              <button
                type="button"
                className="nb-top-bar__icon"
                aria-label={signOutLabel}
                title={signOutLabel}
                onClick={() => void onSignOut()}
              >
                <IconLogOut width={18} height={18} />
              </button>
            </div>
          </header>

          <main
            id="main-content"
            className="portal-content"
            tabIndex={-1}
            style={{
              flex: 1,
              minWidth: 0,
              width: '100%',
              overflowY: 'auto',
              padding: `${spacing[6]}px ${spacing[8]}px var(--support-widget-clearance, 96px)`,
              scrollPaddingBottom: 'var(--support-widget-clearance, 96px)',
              boxSizing: 'border-box',
            }}
          >
            {children}
          </main>
        </div>
        <SidebarNavTooltip tooltip={navTooltip} />
      </div>
  );
}
