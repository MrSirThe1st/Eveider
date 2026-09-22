'use client';

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
 * Secondary settings nav: labelled sections beside page content.
 */
export function SettingsSecondaryNav({ groups }: SettingsSecondaryNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections des paramètres" className="settings-secondary-nav">
      <div className="settings-secondary-nav__groups">
        {groups.map((group) => {
          const headingId = `settings-nav-${group.id}`;
          return (
            <section
              key={group.id}
              className="settings-secondary-nav__group"
              aria-labelledby={headingId}
            >
              <h2 id={headingId} className="settings-secondary-nav__heading">
                {group.label}
              </h2>
              <ul className="settings-secondary-nav__list">
                {group.items.map((item) => {
                  const active = isSettingsNavItemActive(item, pathname);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={['settings-secondary-nav__link', active ? 'is-active' : null]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
