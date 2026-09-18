import {
  PARCEL_RETURN_METHOD_LABELS,
  PARCEL_RETURN_STATUS_LABELS,
  canCancelParcelReturn,
  canCompleteBusinessPickup,
  canDepositCustomerReturn,
  canRequestCustomerReturn,
  isActiveParcelReturnStatus,
  type ParcelReturnMethod,
  type ParcelReturnStatus,
  type ParcelStatus,
} from '@eveider/domain';

export type ParcelReturnView = {
  id: string;
  status: ParcelReturnStatus;
  statusLabel: string;
  method: ParcelReturnMethod | null;
  methodLabel: string | null;
  returnLocker: { id: string; name: string; address: string } | null;
  compartmentLabel: string | null;
  returnCode: string | null;
  requestedAt: string;
  authorizedAt: string | null;
  depositedAt: string | null;
  completedAt: string | null;
  canCancel: boolean;
  canDeposit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canConfirmPickup: boolean;
  canAssignDriver: boolean;
};

export function toParcelReturnView(
  record: {
    id: string;
    status: ParcelReturnStatus;
    method: ParcelReturnMethod | null;
    returnLocker: { id: string; name: string; address: string } | null;
    compartmentLabel: string | null;
    returnCode: string | null;
    requestedAt: Date;
    authorizedAt: Date | null;
    depositedAt: Date | null;
    completedAt: Date | null;
  },
  options?: { includeReturnCode?: boolean },
): ParcelReturnView {
  return {
    id: record.id,
    status: record.status,
    statusLabel: PARCEL_RETURN_STATUS_LABELS[record.status],
    method: record.method,
    methodLabel: record.method ? PARCEL_RETURN_METHOD_LABELS[record.method] : null,
    returnLocker: record.returnLocker,
    compartmentLabel: record.compartmentLabel,
    returnCode: options?.includeReturnCode ? record.returnCode : null,
    requestedAt: record.requestedAt.toISOString(),
    authorizedAt: record.authorizedAt?.toISOString() ?? null,
    depositedAt: record.depositedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    canCancel: canCancelParcelReturn(record.status),
    canDeposit: canDepositCustomerReturn(record.status),
    canApprove: record.status === 'requested',
    canReject: record.status === 'requested',
    canConfirmPickup: canCompleteBusinessPickup(record.status, record.method),
    canAssignDriver:
      record.status === 'awaiting_pickup' && record.method === 'eveider_return',
  };
}

export function customerReturnEligible(status: ParcelStatus, hasActiveReturn: boolean): boolean {
  return canRequestCustomerReturn(status) && !hasActiveReturn;
}

export function isActiveCustomerReturn(
  status: ParcelReturnStatus | null | undefined,
): boolean {
  return status != null && isActiveParcelReturnStatus(status);
}
