'use client';

import { colors, radius, spacing, typography, borderSubtle } from '@eveider/config-ui';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useId, useState, useEffect, useRef, type ReactNode } from 'react';
import { Button } from './button.js';
import { IconUser } from './icons.js';

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
  items?: NavItem[];
};

export type AppShellProps = {
  brand: string;
  brandShort?: string;
  modules: NavModule[];
  onSignOut: () => void | Promise<void>;
  signOutLabel?: string;
  children: ReactNode;
  maxWidth?: number;
  profileHref?: string;
};

const MODULE_SIDEBAR_WIDTH = 220;
const TOP_BAR_HEIGHT = 64;

function defaultItemActive(href: string, pathname: string, search: string): boolean {
  const qIndex = href.indexOf('?');
  const path = qIndex >= 0 ? href.slice(0, qIndex) : href;
  const queryPart = qIndex >= 0 ? href.slice(qIndex + 1) : '';

  if (pathname !== path) {
    return pathname.startsWith(`${path}/`) && !queryPart;
  }

  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (!queryPart) {
    return !current.get('status');
  }

  const hrefParams = new URLSearchParams(queryPart);
  for (const [key, value] of hrefParams.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

type ProfileDropdownProps = {
  profileHref: string;
  onSignOut: () => void | Promise<void>;
  signOutLabel?: string;
};

function ProfileDropdownItem({
  children,
  href,
  onClick,
  tone = 'default',
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: 'default' | 'danger';
}) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    borderRadius: radius.sm,
    textDecoration: 'none',
    border: 'none',
    background: hovered ? colors.surfaceSubtle : 'transparent',
    color: tone === 'danger' ? colors.danger : colors.secondary,
    fontSize: typography.bodySm.fontSize,
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    fontFamily: typography.fontFamily,
    boxSizing: 'border-box',
  };

  if (href) {
    return (
      <Link
        href={href}
        style={style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ProfileDropdown({ profileHref, onSignOut, signOutLabel = 'Déconnexion' }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  return (
    <div
      ref={rootRef}
      className="nb-profile-dropdown"
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menu profil"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          padding: 0,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: '50%',
          background: open ? colors.surfaceSubtle : colors.surface,
          color: colors.secondary,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}
      >
        <IconUser width={20} height={20} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 40,
            minWidth: 160,
            padding: 4,
            background: colors.surface,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radius.md,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <ProfileDropdownItem href={profileHref} onClick={() => setOpen(false)}>
            Modifier le profil
          </ProfileDropdownItem>
          <ProfileDropdownItem
            tone="danger"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
          >
            {signOutLabel}
          </ProfileDropdownItem>
        </div>
      ) : null}
    </div>
  );
}

function AppShellChrome({
  brand,
  brandShort = 'EV',
  modules,
  onSignOut,
  signOutLabel = 'Déconnexion',
  children,
  maxWidth = 1200,
  search,
  profileHref,
}: AppShellProps & { search: string }) {
  const pathname = usePathname();

  const activeModule = modules.find((mod) => mod.match(pathname)) ?? modules[0] ?? null;
  const moduleItems = activeModule?.items ?? [];
  const showModuleSidebar = moduleItems.length >= 2;

  return (
    <div
      className="portal-shell"
      style={{
        minHeight: '100vh',
        background: colors.background,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <a href="#main-content" className="nb-skip-link">
        Aller au contenu
      </a>

      <header
        className="nb-top-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          minHeight: TOP_BAR_HEIGHT,
          flexShrink: 0,
          background: colors.surface,
          borderBottom: borderSubtle(),
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: spacing[4],
          paddingTop: `max(${spacing[3]}px, env(safe-area-inset-top, 0px))`,
          paddingBottom: spacing[3],
          paddingLeft: spacing[5],
          paddingRight: spacing[5],
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: spacing[2],
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontWeight: typography.weights.bold,
              fontSize: typography.body.fontSize,
              color: colors.secondary,
            }}
          >
            Eveider
          </span>
          <span
            style={{
              fontSize: typography.caption.fontSize,
              fontWeight: typography.weights.semibold,
              color: colors.textMuted,
            }}
            title={brand}
          >
            {brandShort}
          </span>
        </div>

        <nav
          aria-label="Modules"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
            overflowX: 'auto',
            minWidth: 0,
          }}
        >
          {modules.map((mod) => {
            const active = activeModule?.id === mod.id;
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className="nb-top-nav__link"
                aria-current={active ? 'page' : undefined}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                  borderRadius: radius.badge,
                  textDecoration: 'none',
                  fontSize: typography.bodySm.fontSize,
                  fontWeight: active
                    ? typography.weights.semibold
                    : typography.weights.medium,
                  color: colors.secondary,
                  background: active ? colors.successMuted : 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {mod.icon ? (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-flex',
                      flexShrink: 0,
                      color: active ? colors.primary : colors.textMuted,
                    }}
                  >
                    {mod.icon}
                  </span>
                ) : null}
                {mod.label}
              </Link>
            );
          })}
        </nav>

        {profileHref ? (
          <ProfileDropdown
            profileHref={profileHref}
            onSignOut={onSignOut}
            signOutLabel={signOutLabel}
          />
        ) : (
          <Button variant="secondary" size="sm" onClick={() => void onSignOut()}>
            {signOutLabel}
          </Button>
        )}
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {showModuleSidebar && activeModule ? (
          <aside
            className="nb-module-sidebar"
            aria-label={`${activeModule.label} — navigation`}
            style={{
              width: MODULE_SIDEBAR_WIDTH,
              flexShrink: 0,
              background: colors.surface,
              borderRight: borderSubtle(),
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
              height: '100vh',
              maxHeight: '100vh',
              overflowY: 'auto',
              padding: `${spacing[5]}px ${spacing[3]}px`,
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                margin: `0 0 ${spacing[3]}px`,
                padding: `0 ${spacing[2]}px`,
                fontSize: typography.caption.fontSize,
                fontWeight: typography.weights.bold,
                color: colors.secondary,
                letterSpacing: '0.02em',
              }}
            >
              {activeModule.label}
            </p>
            <nav
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[1],
              }}
            >
              {moduleItems.map((item) => {
                const active = item.isActive
                  ? item.isActive(pathname, search)
                  : defaultItemActive(item.href, pathname, search);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nb-module-nav__link"
                    aria-current={active ? 'page' : undefined}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      padding: `${spacing[2] + 2}px ${spacing[3]}px`,
                      borderRadius: radius.md,
                      textDecoration: 'none',
                      fontSize: typography.bodySm.fontSize,
                      fontWeight: active
                        ? typography.weights.semibold
                        : typography.weights.medium,
                      color: active ? colors.secondary : colors.textMuted,
                      background: active ? colors.surfaceSubtle : 'transparent',
                    }}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '22%',
                          bottom: '22%',
                          width: 3,
                          borderRadius: 2,
                          background: colors.primary,
                        }}
                      />
                    ) : null}
                    {item.icon ? (
                      <span style={{ display: 'flex', flexShrink: 0, opacity: 0.85 }}>
                        {item.icon}
                      </span>
                    ) : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            padding: `${spacing[7]}px ${spacing[6]}px ${spacing[12]}px`,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '100%', maxWidth, margin: '0 auto' }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

function AppShellWithSearch(props: AppShellProps) {
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return <AppShellChrome {...props} search={search} />;
}

/**
 * Portal chrome: top module bar + optional page-level module sidebar.
 * No global sidebar.
 */
export function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<AppShellChrome {...props} search="" />}>
      <AppShellWithSearch {...props} />
    </Suspense>
  );
}
