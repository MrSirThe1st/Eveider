'use client';

import { useSyncExternalStore } from 'react';
import { readTheme, subscribeTheme, toggleTheme } from '@/lib/theme';

function getServerSnapshot() {
  return 'light' as const;
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, getServerSnapshot);
  const isDark = theme === 'dark';
  const label = isDark ? 'Activer le thème clair' : 'Activer le thème sombre';

  return (
    <button
      type="button"
      className={['nb-top-bar__icon', className].filter(Boolean).join(' ')}
      onClick={() => toggleTheme()}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      suppressHydrationWarning
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 14.3A8.5 8.5 0 1 1 9.7 3 7 7 0 0 0 21 14.3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
