'use client';

import { borderSubtle, colors, radius, spacing, typography } from '@eveider/config-ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  isSettingsNavItemActive,
  type SettingsNavGroup,
} from '@/lib/settings-nav';

type SettingsSecondaryNavProps = {
  groups: SettingsNavGroup[];
};

/**
 * PostHog-style secondary settings nav: section headers + links beside page content.
 */
export function SettingsSecondaryNav({ groups }: SettingsSecondaryNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections des paramètres"
      className="settings-secondary-nav"
      style={{
        width: '100%',
        maxWidth: 220,
        flexShrink: 0,
        paddingTop: spacing[1],
        paddingBottom: spacing[4],
        paddingRight: spacing[3],
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'grid', gap: spacing[4] }}>
        {groups.map((group) => (
          <div key={group.id}>
            <p
              style={{
                margin: `0 0 ${spacing[2]}px`,
                paddingLeft: spacing[2],
                fontSize: '0.6875rem',
                fontWeight: typography.weights.semibold,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: colors.textMuted,
              }}
            >
              {group.label}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
              {group.items.map((item) => {
                const active = isSettingsNavItemActive(item, pathname);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      style={{
                        display: 'block',
                        padding: `${spacing[1] + 2}px ${spacing[2]}px`,
                        borderRadius: radius.sm,
                        fontSize: typography.bodySm.fontSize,
                        fontWeight: active
                          ? typography.weights.semibold
                          : typography.weights.medium,
                        color: active ? colors.secondary : colors.textMuted,
                        background: active ? colors.surfaceSubtle : 'transparent',
                        textDecoration: 'none',
                        border: active ? borderSubtle() : '1px solid transparent',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .settings-secondary-nav {
            max-width: none !important;
            padding-right: 0 !important;
            border-bottom: 1px solid ${colors.borderSubtle};
            margin-bottom: ${spacing[4]}px;
          }
          .settings-secondary-nav ul {
            display: flex !important;
            flex-wrap: wrap;
            gap: 4px !important;
          }
        }
      `}</style>
    </nav>
  );
}
