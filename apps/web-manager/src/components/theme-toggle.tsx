'use client';

import { useSyncExternalStore } from 'react';
import { readTheme, subscribeTheme, toggleTheme } from '@/lib/theme';

function getServerSnapshot() {
  return 'light' as const;
}

export function ThemeToggle({
  className,
  variant = 'icon',
}: {
  className?: string;
  variant?: 'icon' | 'menu';
}) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, getServerSnapshot);
  const isDark = theme === 'dark';

  if (variant === 'menu') {
    return (
      <button
        type="button"
        role="menuitem"
        className={className}
        onClick={() => toggleTheme()}
        aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
        aria-pressed={isDark}
        suppressHydrationWarning
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '8px 12px',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--color-secondary)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = 'var(--color-surface-subtle)';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = 'transparent';
        }}
      >
        {isDark ? 'Thème clair' : 'Thème sombre'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => toggleTheme()}
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      aria-pressed={isDark}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
      suppressHydrationWarning
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        padding: 0,
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-button)',
        background: 'var(--color-surface-subtle)',
        color: 'var(--color-secondary)',
        cursor: 'pointer',
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
