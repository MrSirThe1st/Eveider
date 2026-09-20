import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';
import { StatusBadge, type StatusBadgeTone } from '@eveider/ui';

type ParcelStatusBadgeProps = {
  status: ParcelStatus;
  label?: string;
};

const STATUS_TONES: Record<ParcelStatus, StatusBadgeTone> = {
  ready_for_pickup: 'success',
  delivered_to_locker: 'warning',
  in_transit: 'info',
  created: 'neutral',
  collected: 'neutral',
  return_at_point: 'info',
  returning: 'info',
  returned: 'neutral',
};

export function ParcelStatusBadge({ status, label }: ParcelStatusBadgeProps) {
  return (
    <StatusBadge tone={STATUS_TONES[status] ?? 'neutral'}>
      {label ?? PARCEL_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
