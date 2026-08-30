'use client';

import { StatusBadge, type StatusBadgeTone } from '@eveider/ui';
import type { DriverOperationalStatus } from '@eveider/domain';

const TONE: Record<DriverOperationalStatus, StatusBadgeTone> = {
  available: 'success',
  on_delivery: 'info',
  pending_approval: 'warning',
  suspended: 'danger',
  rejected: 'danger',
};

type DriverStatusBadgeProps = {
  status: DriverOperationalStatus;
  label: string;
};

export function DriverStatusBadge({ status, label }: DriverStatusBadgeProps) {
  return (
    <StatusBadge tone={TONE[status]} withDot>
      {label}
    </StatusBadge>
  );
}
