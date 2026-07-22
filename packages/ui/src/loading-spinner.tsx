import { colors } from '@eveider/config-ui';

export type LoadingSpinnerProps = {
  /** Accessible label for screen readers. */
  label?: string;
  /** Spinner diameter in pixels. */
  size?: number;
  /** Minimum height of the centered container (useful for page-level loading). */
  minHeight?: number | string;
};

/**
 * Centered loading indicator — use for page/section loads, never inline next to text.
 */
export function LoadingSpinner({
  label = 'Chargement…',
  size = 40,
  minHeight = '12rem',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        width: '100%',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `3px solid ${colors.borderSubtle}`,
          borderTopColor: colors.primary,
          animation: 'eveider-spin 0.75s linear infinite',
        }}
      />
      <span
        style={{
          marginTop: '0.875rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: colors.textMuted,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
      <style>{`@keyframes eveider-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
