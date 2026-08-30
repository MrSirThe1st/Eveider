'use client';

import { ADMIN_ACCOUNT_STATUS_LABELS, type AdminAccountStatus } from '@eveider/domain';

type AdminAccountStatusBadgeProps = {
  status: AdminAccountStatus;
};

const STATUS_STYLES: Record<
  AdminAccountStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  active: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  suspended: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
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
