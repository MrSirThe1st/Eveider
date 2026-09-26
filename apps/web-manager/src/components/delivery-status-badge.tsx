import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from '@eveider/domain';
import { StatusBadge, type StatusBadgeTone } from '@eveider/ui';

type DeliveryStatusBadgeProps = {
  status: DeliveryStatus;
  label?: string;
};

const TONE: Record<DeliveryStatus, StatusBadgeTone> = {
  completed: 'success',
  scanned: 'info',
  assigned: 'neutral',
  accepted: 'neutral',
  started: 'info',
  drop_off_pending: 'warning',
  failed: 'danger',
};

export function DeliveryStatusBadge({ status, label }: DeliveryStatusBadgeProps) {
  return (
    <StatusBadge tone={TONE[status] ?? 'neutral'}>
      {label ?? DELIVERY_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
