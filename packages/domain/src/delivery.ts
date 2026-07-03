export type DeliveryStatus =
  | 'assigned'
  | 'scanned'
  | 'drop_off_pending'
  | 'completed'
  | 'failed';

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'assigned',
  'scanned',
  'drop_off_pending',
  'completed',
  'failed',
] as const;

const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  assigned: ['scanned', 'failed'],
  scanned: ['drop_off_pending', 'failed'],
  drop_off_pending: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}

export function transitionDelivery(from: DeliveryStatus, to: DeliveryStatus): DeliveryStatus {
  if (!canTransitionDelivery(from, to)) {
    throw new Error(`Invalid delivery transition: ${from} → ${to}`);
  }
  return to;
}

export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return status === 'completed' || status === 'failed';
}
