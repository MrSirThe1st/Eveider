import { colors } from '@eveider/config-ui';
import type { CSSProperties } from 'react';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg';

export type SpinnerProps = {
  size?: LoadingSpinnerSize;
  /** Cell color. Defaults to Eveider green. Use `currentColor` inside buttons. */
  color?: string;
  className?: string;
  style?: CSSProperties;
};

export type LoadingSpinnerProps = {
  /** Accessible label for screen readers only — never shown on screen. */
  label?: string;
  /** Overall size of the 2×2 block. */
  size?: LoadingSpinnerSize;
  /** @deprecated Overlay fills the viewport; kept so existing call sites type-check. */
  minHeight?: number | string;
  /** Inline row with the label beside the spinner — for refresh hints and compact CRUD waits. */
  compact?: boolean;
};

const SIZE_PX: Record<LoadingSpinnerSize, number> = {
  sm: 18,
  md: 48,
  lg: 72,
};

const GAP_PX: Record<LoadingSpinnerSize, number> = {
  sm: 0,
  md: 0,
  lg: 0,
};

const SPINNER_DURATION = '1.1s';

/** Top-left → top-right → bottom-right → bottom-left. */
const CELLS = [
  { row: 1, column: 1 },
  { row: 1, column: 2 },
  { row: 2, column: 2 },
  { row: 2, column: 1 },
] as const;

const SPINNER_STYLES = `
.eveider-spinner__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  width: var(--eveider-spinner-size);
  height: var(--eveider-spinner-size);
  gap: var(--eveider-spinner-gap);
  flex-shrink: 0;
  color: inherit;
}

.eveider-spinner__cell {
  width: 100%;
  height: 100%;
  background-color: currentColor;
  opacity: 0;
  animation: eveider-spinner-cell var(--eveider-spinner-duration) cubic-bezier(0.45, 0, 0.2, 1) infinite;
}

.eveider-spinner__cell:nth-child(1) { animation-delay: 0s; }
.eveider-spinner__cell:nth-child(2) { animation-delay: calc(var(--eveider-spinner-duration) * 0.25); }
.eveider-spinner__cell:nth-child(3) { animation-delay: calc(var(--eveider-spinner-duration) * 0.5); }
.eveider-spinner__cell:nth-child(4) { animation-delay: calc(var(--eveider-spinner-duration) * 0.75); }

@keyframes eveider-spinner-cell {
  0% { opacity: 0; }
  14% { opacity: 1; }
  22% { opacity: 1; }
  40% { opacity: 0; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .eveider-spinner__cell {
    animation: none;
    opacity: 0;
  }

  .eveider-spinner__cell:nth-child(1) {
    opacity: 1;
  }
}
`;

/**
 * 2×2 block spinner — the reusable motion mark.
 */
export function Spinner({
  size = 'md',
  color = colors.primary,
  className,
  style,
}: SpinnerProps) {
  return (
    <>
      <div
        className={['eveider-spinner__grid', className].filter(Boolean).join(' ')}
        aria-hidden="true"
        style={
          {
            color,
            '--eveider-spinner-size': `${SIZE_PX[size]}px`,
            '--eveider-spinner-gap': `${GAP_PX[size]}px`,
            '--eveider-spinner-duration': SPINNER_DURATION,
            ...style,
          } as CSSProperties
        }
      >
        {CELLS.map((cell) => (
          <span
            key={`${cell.row}-${cell.column}`}
            className="eveider-spinner__cell"
            style={{ gridRow: cell.row, gridColumn: cell.column }}
          />
        ))}
      </div>
      <style>{SPINNER_STYLES}</style>
    </>
  );
}

/**
 * Full-viewport loading overlay, centered on screen.
 * Pass `compact` for inline refresh hints and in-form waits.
 */
export function LoadingSpinner({
  label = 'Chargement…',
  size = 'lg',
  compact = false,
}: LoadingSpinnerProps) {
  if (compact) {
    return (
      <div
        role="status"
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <Spinner size={size === 'lg' ? 'sm' : size} />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--color-background) 88%, transparent)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <Spinner size={size} />
    </div>
  );
}
