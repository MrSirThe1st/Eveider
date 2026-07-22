import { vi } from 'vitest';
import type { Queryable } from '../db/pool.js';

export type QueryRows =
  | Record<string, unknown>
  | Record<string, unknown>[]
  | null
  | undefined;

export type QueryHandler = (sql: string, values?: unknown[]) => QueryRows;

const now = new Date('2026-01-15T12:00:00.000Z');

export function queryResult(rows: QueryRows) {
  const list = rows == null ? [] : Array.isArray(rows) ? rows : [rows];
  return {
    rows: list,
    rowCount: list.length,
    command: 'SELECT' as const,
    oid: 0,
    fields: [] as never[],
  };
}

/** Sequential handlers — one per query call, in order. */
export function createQueryMock(handlers: QueryHandler[]): Queryable {
  let call = 0;
  return {
    query: vi.fn(async (sql: string, values?: unknown[]) => {
      const handler = handlers[call++];
      if (!handler) {
        throw new Error(`Unexpected query #${call}: ${sql}`);
      }
      return queryResult(handler(sql, values));
    }),
  };
}

/** Match-by-SQL content — resilient to Promise.all reordering. */
export function createSqlMatchMock(
  resolve: (sql: string, values?: unknown[]) => QueryRows,
): Queryable {
  return {
    query: vi.fn(async (sql: string, values?: unknown[]) => queryResult(resolve(sql, values))),
  };
}

export function sqlIncludes(sql: string, ...parts: string[]): boolean {
  const normalized = sql.replace(/\s+/g, ' ');
  return parts.every((part) => normalized.includes(part));
}

export function parcelRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'parcel-1',
    reference: 'PK-001',
    status: 'created',
    business_id: 'biz-1',
    customer_id: null,
    recipient_phone: '+243000000000',
    recipient_name: 'Client',
    locker_id: 'locker-1',
    compartment_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function businessRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'biz-1',
    name: 'Pharmacy',
    status: 'active',
    business_type: null,
    industry: null,
    sales_channels: [],
    description: null,
    risk_classification: null,
    contact_email: null,
    contact_phone: null,
    is_phone_verified: false,
    otp_code: null,
    otp_expires_at: null,
    legal_company_name: null,
    rccm_number: null,
    nif_number: null,
    date_created: null,
    legal_rep_name: null,
    individual_full_name: null,
    id_passport_number: null,
    residential_address: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function lockerRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'locker-1',
    code: 'GOMBE',
    name: 'EVEIDER GOMBE',
    address: 'Gombe',
    latitude: null,
    longitude: null,
    rows: 5,
    columns: 4,
    status: 'active',
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function compartmentRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'comp-1',
    locker_id: 'locker-1',
    label: 'A1',
    size: 'medium',
    status: 'available',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function deliveryRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'delivery-1',
    parcel_id: 'parcel-1',
    courier_id: 'courier-1',
    status: 'assigned',
    scanned_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function notificationRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'notif-1',
    user_id: 'user-1',
    parcel_id: 'parcel-1',
    channel: 'in_app',
    message: 'Test',
    sent_at: null,
    created_at: now,
    ...overrides,
  };
}

export function issueRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'issue-1',
    type: 'parcel_problem',
    status: 'open',
    parcel_id: 'parcel-1',
    locker_id: 'locker-1',
    reporter_id: 'user-1',
    description: 'Colis endommagé',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function paymentRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'payment-1',
    parcel_id: 'parcel-1',
    user_id: 'user-1',
    deposit_id: 'deposit-1',
    amount: '5',
    currency: 'USD',
    provider: 'ORANGE_COD',
    phone_number: '+243800000000',
    status: 'pending',
    pawapay_status: null,
    failure_reason: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function courierDeliveryJoin(
  deliveryOverrides: Partial<Record<string, unknown>> = {},
  parcelOverrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    ...deliveryRow(deliveryOverrides),
    locker_row: lockerRow(),
    business_relation_id: 'biz-1',
    business_name: 'Shop',
    compartment_json: null,
    parcel_row: parcelRow(parcelOverrides),
  };
}

export { now as fixtureNow };
