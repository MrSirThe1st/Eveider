'use client';

import { colors } from '@eveider/config-ui';
import { ADMIN_ACCOUNT_STATUS_LABELS, type AdminAccountStatus } from '@eveider/domain';

type AdminAccountStatusBadgeProps = {
  status: AdminAccountStatus;
};

const STATUS_STYLES: Record<
  AdminAccountStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  active: {
    bg: colors.successMuted,
    color: colors.successFg,
    dot: colors.success,
    border: colors.primaryMuted,
  },
  suspended: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.borderSubtle,
  },
};

export function AdminAccountStatusBadge({ status }: AdminAccountStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.active;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.25rem 0.65rem',
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: style.dot,
        }}
      />
      {ADMIN_ACCOUNT_STATUS_LABELS[status]}
    </span>
  );
}
