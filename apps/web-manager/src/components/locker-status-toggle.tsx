'use client';

import { colors, radius, spacing, typography, borderSubtle, shadows } from '@eveider/config-ui';
import { LOCKER_STATUS_LABELS, type LockerStatus } from '@eveider/domain';
import { useEffect, useId, useRef, useState } from 'react';

type LockerStatusToggleProps = {
  status: LockerStatus;
  options: LockerStatus[];
  disabled?: boolean;
  onChange: (status: LockerStatus) => void;
};

const STATUS_STYLES: Record<
  LockerStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  active: {
    bg: colors.successMuted,
    color: colors.successFg,
    dot: colors.success,
    border: colors.primaryMuted,
  },
  offline: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.border,
  },
  full: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  archived: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.border,
  },
};

/**
 * Shows the current locker status; opens a menu of allowed transitions below.
 */
export function LockerStatusToggle({
  status,
  options,
  disabled = false,
  onChange,
}: LockerStatusToggleProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.offline;
  const canOpen = !disabled && options.length > 0;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) setOpen(false);
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
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={canOpen ? menuId : undefined}
        disabled={!canOpen}
        onClick={() => setOpen((current) => !current)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spacing[2],
          fontSize: '0.8125rem',
          fontWeight: 600,
          padding: `${spacing[1] + 2}px ${spacing[3]}px`,
          borderRadius: radius.badge,
          border: `1px solid ${style.border}`,
          background: style.bg,
          color: style.color,
          cursor: canOpen ? 'pointer' : 'default',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: style.dot,
            flexShrink: 0,
          }}
        />
        {LOCKER_STATUS_LABELS[status]}
        {canOpen ? (
          <span aria-hidden style={{ fontSize: '0.65rem', opacity: 0.75, lineHeight: 1 }}>
            ▾
          </span>
        ) : null}
      </button>

      {open && canOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Changer le statut du point"
          style={{
            position: 'absolute',
            top: `calc(100% + ${spacing[1]}px)`,
            right: 0,
            zIndex: 20,
            minWidth: 160,
            padding: spacing[1],
            background: colors.surface,
            border: borderSubtle(),
            borderRadius: radius.md,
            boxShadow: shadows.hard,
          }}
        >
          {options.map((next) => (
            <button
              key={next}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onChange(next);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: `${spacing[2]}px ${spacing[3]}px`,
                border: 'none',
                borderRadius: radius.sm,
                background: 'transparent',
                color: colors.secondary,
                fontFamily: typography.fontFamily,
                fontSize: typography.bodySm.fontSize,
                fontWeight: typography.weights.semibold,
                cursor: disabled ? 'wait' : 'pointer',
              }}
            >
              {LOCKER_STATUS_LABELS[next]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
