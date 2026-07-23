import type {
  Business,
  BusinessDocument,
  BusinessLimit,
  BusinessLocation,
  BusinessPermission,
  BusinessStatusHistory,
  BusinessVerification,
  BillingAccount,
  Compartment,
  Delivery,
  Issue,
  Locker,
  Notification,
  Parcel,
  ParcelInvite,
  ParcelPayment,
  PickupPin,
  SettlementAccount,
  User,
  VerificationCheck,
} from './types.js';

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value == null) throw new Error('Expected date value');
  return new Date(String(value));
}

function asDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  return asDate(value);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    authId: String(row.auth_id),
    role: row.role as User['role'],
    userRole: (row.user_role as User['userRole']) ?? null,
    email: row.email == null ? null : String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    fullName: row.full_name == null ? null : String(row.full_name),
    businessId: row.business_id == null ? null : String(row.business_id),
    isBlocked: Boolean(row.is_blocked),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapBusiness(row: Record<string, unknown>): Business {
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status as Business['status'],
    businessType: (row.business_type as Business['businessType']) ?? null,
    industry: row.industry == null ? null : String(row.industry),
    salesChannels: asStringArray(row.sales_channels),
    description: row.description == null ? null : String(row.description),
    riskClassification: (row.risk_classification as Business['riskClassification']) ?? null,
    contactEmail: row.contact_email == null ? null : String(row.contact_email),
    contactPhone: row.contact_phone == null ? null : String(row.contact_phone),
    isPhoneVerified: Boolean(row.is_phone_verified),
    otpCode: row.otp_code == null ? null : String(row.otp_code),
    otpExpiresAt: asDateOrNull(row.otp_expires_at),
    legalCompanyName: row.legal_company_name == null ? null : String(row.legal_company_name),
    rccmNumber: row.rccm_number == null ? null : String(row.rccm_number),
    nifNumber: row.nif_number == null ? null : String(row.nif_number),
    dateCreated: asDateOrNull(row.date_created),
    legalRepName: row.legal_rep_name == null ? null : String(row.legal_rep_name),
    individualFullName: row.individual_full_name == null ? null : String(row.individual_full_name),
    idPassportNumber: row.id_passport_number == null ? null : String(row.id_passport_number),
    residentialAddress: row.residential_address == null ? null : String(row.residential_address),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapLocker(row: Record<string, unknown>): Locker {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    address: String(row.address),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    rows: Number(row.rows),
    columns: Number(row.columns),
    type: (row.type as Locker['type'] | undefined) ?? 'SMART_LOCKER',
    maxCapacity: row.max_capacity == null ? null : Number(row.max_capacity),
    contactPhone: row.contact_phone == null ? null : String(row.contact_phone),
    contactName: row.contact_name == null ? null : String(row.contact_name),
    notes: row.notes == null ? null : String(row.notes),
    commissionType: (row.commission_type as Locker['commissionType']) ?? null,
    commissionValue: row.commission_value == null ? null : Number(row.commission_value),
    commissionCurrency: row.commission_currency == null ? null : String(row.commission_currency),
    status: row.status as Locker['status'],
    archivedAt: asDateOrNull(row.archived_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapCompartment(row: Record<string, unknown>): Compartment {
  return {
    id: String(row.id),
    lockerId: String(row.locker_id),
    label: String(row.label),
    size: row.size as Compartment['size'],
    status: row.status as Compartment['status'],
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapParcel(row: Record<string, unknown>): Parcel {
  return {
    id: String(row.id),
    trackingNumber: String(row.tracking_number),
    reference: row.reference == null || row.reference === '' ? null : String(row.reference),
    status: row.status as Parcel['status'],
    businessId: String(row.business_id),
    customerId: row.customer_id == null ? null : String(row.customer_id),
    recipientPhone: String(row.recipient_phone),
    recipientName: row.recipient_name == null ? null : String(row.recipient_name),
    lockerId: row.locker_id == null ? null : String(row.locker_id),
    compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapDelivery(row: Record<string, unknown>): Delivery {
  return {
    id: String(row.id),
    parcelId: String(row.parcel_id),
    courierId: String(row.courier_id),
    status: row.status as Delivery['status'],
    scannedAt: asDateOrNull(row.scanned_at),
    completedAt: asDateOrNull(row.completed_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapPickupPin(row: Record<string, unknown>): PickupPin {
  return {
    id: String(row.id),
    parcelId: String(row.parcel_id),
    code: String(row.code),
    expiresAt: asDateOrNull(row.expires_at),
    createdAt: asDate(row.created_at),
  };
}

export function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    userId: row.user_id == null ? null : String(row.user_id),
    parcelId: row.parcel_id == null ? null : String(row.parcel_id),
    channel: row.channel as Notification['channel'],
    message: String(row.message),
    sentAt: asDateOrNull(row.sent_at),
    createdAt: asDate(row.created_at),
  };
}

export function mapIssue(row: Record<string, unknown>): Issue {
  return {
    id: String(row.id),
    type: row.type as Issue['type'],
    status: row.status as Issue['status'],
    parcelId: row.parcel_id == null ? null : String(row.parcel_id),
    lockerId: row.locker_id == null ? null : String(row.locker_id),
    reporterId: String(row.reporter_id),
    description: row.description == null ? null : String(row.description),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapParcelInvite(row: Record<string, unknown>): ParcelInvite {
  return {
    id: String(row.id),
    token: String(row.token),
    parcelId: String(row.parcel_id),
    phone: String(row.phone),
    email: row.email == null ? null : String(row.email),
    status: row.status as ParcelInvite['status'],
    expiresAt: asDate(row.expires_at),
    acceptedAt: asDateOrNull(row.accepted_at),
    createdAt: asDate(row.created_at),
  };
}

export function mapParcelPayment(row: Record<string, unknown>): ParcelPayment {
  return {
    id: String(row.id),
    parcelId: String(row.parcel_id),
    userId: row.user_id == null ? null : String(row.user_id),
    depositId: String(row.deposit_id),
    amount: String(row.amount),
    currency: String(row.currency),
    provider: String(row.provider),
    phoneNumber: String(row.phone_number),
    status: row.status as ParcelPayment['status'],
    pawapayStatus: row.pawapay_status == null ? null : String(row.pawapay_status),
    failureReason: row.failure_reason == null ? null : String(row.failure_reason),
    completedAt: asDateOrNull(row.completed_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapBusinessLocation(row: Record<string, unknown>): BusinessLocation {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    type: row.type as BusinessLocation['type'],
    pickupMethod: row.pickup_method as BusinessLocation['pickupMethod'],
    country: String(row.country),
    city: String(row.city),
    street: String(row.street),
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    contactPerson: row.contact_person == null ? null : String(row.contact_person),
    contactPhone: row.contact_phone == null ? null : String(row.contact_phone),
    availableDays: row.available_days == null ? null : String(row.available_days),
    availableHours: row.available_hours == null ? null : String(row.available_hours),
    dropoffLockerId: row.dropoff_locker_id == null ? null : String(row.dropoff_locker_id),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapBusinessDocument(row: Record<string, unknown>): BusinessDocument {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    type: row.type as BusinessDocument['type'],
    fileUrl: String(row.file_url),
    fileName: row.file_name == null ? null : String(row.file_name),
    status: row.status as BusinessDocument['status'],
    notes: row.notes == null ? null : String(row.notes),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapBillingAccount(row: Record<string, unknown>): BillingAccount {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    paymentRule: row.payment_rule as BillingAccount['paymentRule'],
    billingType: row.billing_type as BillingAccount['billingType'],
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapSettlementAccount(row: Record<string, unknown>): SettlementAccount {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    payoutMethod: row.payout_method as SettlementAccount['payoutMethod'],
    accountHolder: String(row.account_holder),
    accountNumber: String(row.account_number),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapBusinessPermission(row: Record<string, unknown>): BusinessPermission {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    feature: row.feature as BusinessPermission['feature'],
    status: row.status as BusinessPermission['status'],
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapBusinessLimit(row: Record<string, unknown>): BusinessLimit {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    dailyShipments: Number(row.daily_shipments),
    monthlyShipments: Number(row.monthly_shipments),
    maxPackageValueUsd: Number(row.max_package_value_usd),
    codDailyLimitUsd: Number(row.cod_daily_limit_usd),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapBusinessStatusHistory(row: Record<string, unknown>): BusinessStatusHistory {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    previousStatus: row.previous_status as BusinessStatusHistory['previousStatus'],
    newStatus: row.new_status as BusinessStatusHistory['newStatus'],
    changedBy: row.changed_by == null ? null : String(row.changed_by),
    reason: row.reason == null ? null : String(row.reason),
    createdAt: asDate(row.created_at),
  };
}

export function mapBusinessVerification(row: Record<string, unknown>): BusinessVerification {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    status: row.status as BusinessVerification['status'],
    reviewerId: row.reviewer_id == null ? null : String(row.reviewer_id),
    reviewNotes: row.review_notes == null ? null : String(row.review_notes),
    submittedAt: asDate(row.submitted_at),
    reviewedAt: asDateOrNull(row.reviewed_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapVerificationCheck(row: Record<string, unknown>): VerificationCheck {
  return {
    id: String(row.id),
    businessVerificationId: String(row.business_verification_id),
    type: row.type as VerificationCheck['type'],
    status: row.status as VerificationCheck['status'],
    notes: row.notes == null ? null : String(row.notes),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}
