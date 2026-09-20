import { crockfordCheckSymbol } from '@eveider/domain';

/** Deterministic Phase 8 parcel references. Safe to reset independently of demo seeds. */
export const PHASE8_REFERENCE_PREFIX = 'F8-';

export const PHASE8_REFS = {
  FLOW1_NEW: 'F8-FLOW1-NEW',
  FLOW1_TRANSIT: 'F8-FLOW1-TRANSIT',
  FLOW1_READY_UNPAID: 'F8-FLOW1-READY-UNPAID',
  FLOW1_READY_PAID: 'F8-FLOW1-READY-PAID',
  FLOW2_NEW: 'F8-FLOW2-NEW',
  FLOW2_READY_UNPAID: 'F8-FLOW2-READY-UNPAID',
  FLOW2_READY_PAID: 'F8-FLOW2-READY-PAID',
  ZERO_FEE: 'F8-ZERO-FEE',
  COLLECTED: 'F8-COLLECTED',
  RETURN_REQUESTED: 'F8-RETURN-REQUESTED',
  RETURN_3A: 'F8-RETURN-3A',
  RETURN_3B: 'F8-RETURN-3B',
  RTS_HISTORICAL: 'F8-RTS-HISTORICAL',
  MISSING_CHARGE: 'F8-MISSING-CHARGE',
  AT_POINT_PIN: 'F8-AT-POINT-PIN',
} as const;

export type Phase8Ref = (typeof PHASE8_REFS)[keyof typeof PHASE8_REFS];

const TRACKING_BODY: Record<Phase8Ref, string> = {
  'F8-FLOW1-NEW': 'F8F1NEW0',
  'F8-FLOW1-TRANSIT': 'F8F1TRN0',
  'F8-FLOW1-READY-UNPAID': 'F8F1RDW0',
  'F8-FLOW1-READY-PAID': 'F8F1RDP0',
  'F8-FLOW2-NEW': 'F8F2NEW0',
  'F8-FLOW2-READY-UNPAID': 'F8F2RDW0',
  'F8-FLOW2-READY-PAID': 'F8F2RDP0',
  'F8-ZERO-FEE': 'F8ZER0F0',
  'F8-COLLECTED': 'F8G0TET0',
  'F8-RETURN-REQUESTED': 'F8RETASK',
  'F8-RETURN-3A': 'F8RET3A0',
  'F8-RETURN-3B': 'F8RET3B0',
  'F8-RTS-HISTORICAL': 'F8RTSHST',
  'F8-MISSING-CHARGE': 'F8MSCHG0',
  'F8-AT-POINT-PIN': 'F8ATP0N0',
};

export function phase8TrackingNumber(ref: Phase8Ref): string {
  const payload = `EVD26${TRACKING_BODY[ref]}`;
  return `${payload}${crockfordCheckSymbol(payload)}`;
}

export const PHASE8_PINS: Partial<Record<Phase8Ref, string>> = {
  'F8-FLOW1-READY-UNPAID': '811001',
  'F8-FLOW1-READY-PAID': '811002',
  'F8-FLOW2-READY-UNPAID': '811003',
  'F8-FLOW2-READY-PAID': '811004',
  'F8-ZERO-FEE': '811005',
  'F8-MISSING-CHARGE': '811006',
  'F8-AT-POINT-PIN': '811007',
};

export const PHASE8_RETURN_CODES: Partial<Record<Phase8Ref, string>> = {
  'F8-RETURN-3A': '911001',
  'F8-RETURN-3B': '911002',
};

export const PHASE8_RECIPIENT = {
  email: 'customer.amina@eveider.cd',
  phone: '+243970111001',
  name: 'Amina Mwamba',
} as const;

export const PHASE8_BUSINESS_EMAIL = 'boutique.lubum@eveider.cd';
export const PHASE8_BUSINESS_PHONE = '+243970100001';
export const PHASE8_DRIVER_EMAIL = 'courier.lubum1@eveider.cd';
export const PHASE8_DEST_LOCKER_NAME = 'EVEIDER KATUBA';
export const PHASE8_RETURN_LOCKER_NAME = 'EVEIDER KAMPEMBA';
export const PHASE8_OTHER_LOCKER_NAME = 'EVEIDER KENYA';
