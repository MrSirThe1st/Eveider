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
  CourierDossier,
  DriverDossier,
  Delivery,
  Issue,
  Locker,
  Notification,
  OrganizationApiKey,
  OrganizationNotificationDelivery,
  OrganizationNotificationEndpoint,
  Parcel,
  ParcelEvent,
  ParcelInvite,
  BusinessTeamInvite,
  PlatformAdminInvite,
  ParcelPayment,
  PickupPin,
  ServiceArea,
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
    platformRole: (row.platform_role as User['platformRole']) ?? null,
    isCustomer: Boolean(row.is_customer),
    email: row.email == null ? null : String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    fullName: row.full_name == null ? null : String(row.full_name),
    isBlocked: Boolean(row.is_blocked),
    deactivatedAt: asDateOrNull(row.deactivated_at),
    deletedAt: asDateOrNull(row.deleted_at),
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
    accessCode: row.access_code == null || row.access_code === '' ? null : String(row.access_code),
    isPlatformOrg: Boolean(row.is_platform_org),
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
    city: row.city == null || row.city === '' ? null : String(row.city),
    serviceAreaId: row.service_area_id == null ? null : String(row.service_area_id),
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

export function mapServiceArea(row: Record<string, unknown>): ServiceArea {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    city: String(row.city),
    status: row.status as ServiceArea['status'],
    notes: row.notes == null ? null : String(row.notes),
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

function asNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
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
    pickupType: (row.pickup_type as Parcel['pickupType']) ?? 'merchant_dropoff',
    senderName: String(row.sender_name ?? 'Eveider'),
    senderPhone: String(row.sender_phone ?? 'n/a'),
    senderAddress:
      row.sender_address == null || row.sender_address === ''
        ? null
        : String(row.sender_address),
    packageSize: (row.package_size as Parcel['packageSize']) ?? 'medium',
    packageLengthCm: asNumberOrNull(row.package_length_cm),
    packageWidthCm: asNumberOrNull(row.package_width_cm),
    packageHeightCm: asNumberOrNull(row.package_height_cm),
    packageWeightKg: asNumberOrNull(row.package_weight_kg),
    packageCategory: (row.package_category as Parcel['packageCategory']) ?? 'other',
    declaredValueCdf: asNumberOrNull(row.declared_value_cdf),
    declaredValueUsd: asNumberOrNull(row.declared_value_usd),
    paymentResponsibility:
      (row.payment_responsibility as Parcel['paymentResponsibility']) ?? 'receiver_pays',
    codAmountCdf: asNumberOrNull(row.cod_amount_cdf),
    codAmountUsd: asNumberOrNull(row.cod_amount_usd),
    deliveryFeeFc: asNumberOrNull(row.delivery_fee_fc),
    deliveryDistanceKm: asNumberOrNull(row.delivery_distance_km),
    pricingSizeUsed: (row.pricing_size_used as Parcel['pricingSizeUsed']) ?? null,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapDelivery(row: Record<string, unknown>): Delivery {
  return {
    id: String(row.id),
    parcelId: String(row.parcel_id),
    driverId: String(row.driver_id),
    courierId: String(row.driver_id),
    kind: row.kind === 'return' ? 'return' : 'outbound',
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

export function mapBusinessTeamInvite(row: Record<string, unknown>): BusinessTeamInvite {
  return {
    id: String(row.id),
    token: String(row.token),
    businessId: String(row.business_id),
    email: String(row.email),
    invitedRole: row.invited_role as BusinessTeamInvite['invitedRole'],
    invitedByUserId: row.invited_by_user_id == null ? null : String(row.invited_by_user_id),
    status: row.status as BusinessTeamInvite['status'],
    expiresAt: asDate(row.expires_at),
    acceptedAt: asDateOrNull(row.accepted_at),
    acceptedUserId: row.accepted_user_id == null ? null : String(row.accepted_user_id),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapPlatformAdminInvite(row: Record<string, unknown>): PlatformAdminInvite {
  return {
    id: String(row.id),
    token: String(row.token),
    email: String(row.email),
    invitedRole: row.invited_role as PlatformAdminInvite['invitedRole'],
    invitedByUserId: row.invited_by_user_id == null ? null : String(row.invited_by_user_id),
    status: row.status as PlatformAdminInvite['status'],
    expiresAt: asDate(row.expires_at),
    acceptedAt: asDateOrNull(row.accepted_at),
    acceptedUserId: row.accepted_user_id == null ? null : String(row.accepted_user_id),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
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

export function mapCourierDossier(row: Record<string, unknown>): CourierDossier {
  return {
    id: String(row.id),
    contractorType: row.contractor_type as CourierDossier['contractorType'],
    businessId: row.business_id == null ? null : String(row.business_id),
    userId: row.user_id == null ? null : String(row.user_id),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    idDocumentUrl: String(row.id_document_url),
    notes: row.notes == null ? null : String(row.notes),
    reviewNotes: row.review_notes == null ? null : String(row.review_notes),
    status: row.status as CourierDossier['status'],
    serviceAreaId: row.service_area_id == null ? null : String(row.service_area_id),
    createdByUserId: row.created_by_user_id == null ? null : String(row.created_by_user_id),
    reviewedByUserId: row.reviewed_by_user_id == null ? null : String(row.reviewed_by_user_id),
    reviewedAt: asDateOrNull(row.reviewed_at),
    invitedAt: asDateOrNull(row.invited_at),
    deactivatedAt: asDateOrNull(row.deactivated_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

function asPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function mapParcelEvent(row: Record<string, unknown>): ParcelEvent {
  return {
    id: String(row.id),
    parcelId: String(row.parcel_id),
    deliveryId: row.delivery_id == null ? null : String(row.delivery_id),
    issueId: row.issue_id == null ? null : String(row.issue_id),
    compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
    eventType: row.event_type as ParcelEvent['eventType'],
    actorType: row.actor_type as ParcelEvent['actorType'],
    actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
    previousParcelStatus:
      row.previous_parcel_status == null
        ? null
        : (row.previous_parcel_status as ParcelEvent['previousParcelStatus']),
    newParcelStatus:
      row.new_parcel_status == null ? null : (row.new_parcel_status as ParcelEvent['newParcelStatus']),
    previousDeliveryStatus:
      row.previous_delivery_status == null
        ? null
        : (row.previous_delivery_status as ParcelEvent['previousDeliveryStatus']),
    newDeliveryStatus:
      row.new_delivery_status == null
        ? null
        : (row.new_delivery_status as ParcelEvent['newDeliveryStatus']),
    payload: asPayload(row.payload),
    createdAt: asDate(row.created_at),
  };
}

export function mapOrganizationApiKey(row: Record<string, unknown>): OrganizationApiKey {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    keyPrefix: String(row.key_prefix),
    secretHash: String(row.secret_hash),
    lastUsedAt: asDateOrNull(row.last_used_at),
    revokedAt: asDateOrNull(row.revoked_at),
    createdAt: asDate(row.created_at),
  };
}

export function mapOrganizationNotificationEndpoint(
  row: Record<string, unknown>,
): OrganizationNotificationEndpoint {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    url: row.url == null || String(row.url).trim() === '' ? null : String(row.url),
    signingSecret: String(row.signing_secret),
    status: row.status === 'disabled' ? 'disabled' : 'active',
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapOrganizationNotificationDelivery(
  row: Record<string, unknown>,
): OrganizationNotificationDelivery {
  return {
    id: String(row.id),
    endpointId: String(row.endpoint_id),
    parcelId: row.parcel_id == null ? null : String(row.parcel_id),
    eventId: row.event_id == null ? null : String(row.event_id),
    eventType: String(row.event_type),
    status: row.status === 'sent' ? 'sent' : 'failed',
    httpStatus: row.http_status == null ? null : Number(row.http_status),
    error: row.error == null ? null : String(row.error),
    createdAt: asDate(row.created_at),
  };
}
