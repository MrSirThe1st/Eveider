'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';

export type PageTab = {
  href: string;
  label: string;
  icon?: ReactNode;
  isActive?: (pathname: string, search: string) => boolean;
};

export type PageTabsProps = {
  tabs: PageTab[];
  'aria-label'?: string;
};

function parseSearch(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function defaultTabActive(href: string, pathname: string, search: string): boolean {
  const qIndex = href.indexOf('?');
  const path = qIndex >= 0 ? href.slice(0, qIndex) : href;
  const queryPart = qIndex >= 0 ? href.slice(qIndex + 1) : '';

  if (pathname !== path) {
    return pathname.startsWith(`${path}/`) && !queryPart;
  }

  const current = parseSearch(search);
  if (!queryPart) {
    return !current.get('view');
  }

  const hrefParams = new URLSearchParams(queryPart);
  for (const [key, value] of hrefParams.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

function PageTabsNav({ tabs, 'aria-label': ariaLabel = 'Vues' }: PageTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname, search]);

  return (
    <nav
      aria-label={ariaLabel}
      className="nb-page-tabs"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing[1],
        marginBottom: spacing[6],
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      {tabs.map((tab) => {
        const routeActive = tab.isActive
          ? tab.isActive(pathname, search)
          : defaultTabActive(tab.href, pathname, search);
        const active = pendingHref ? pendingHref === tab.href : routeActive;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="nb-page-tabs__link"
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (!routeActive) setPendingHref(tab.href);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[2] + 2}px ${spacing[3]}px`,
              marginBottom: -1,
              textDecoration: 'none',
              fontSize: typography.bodySm.fontSize,
              fontWeight: active ? typography.weights.semibold : typography.weights.medium,
              color: active ? colors.secondary : colors.textMuted,
              borderBottom: `2px solid ${active ? colors.primary : 'transparent'}`,
            }}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** In-page secondary navigation (views, sibling lists). Use inside PageFrame. */
export function PageTabs(props: PageTabsProps) {
  return (
    <Suspense fallback={<div className="nb-page-tabs" style={{ minHeight: 40, marginBottom: spacing[6] }} />}>
      <PageTabsNav {...props} />
    </Suspense>
  );
}
