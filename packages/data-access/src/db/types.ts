/**
 * Database entity types (camelCase). Column names in SQL remain snake_case.
 * These replace Prisma-generated model types.
 */

import type {
  BusinessStatus,
  CommissionType,
  CompartmentSize,
  CompartmentStatus,
  DeliveryKind,
  DeliveryStatus,
  DriverDossierStatus,
  IssueStatus,
  IssueType,
  LockerStatus,
  LockerType,
  OrganizationRole,
  PackageCategory,
  PackageSize,
  ParcelEventActorType,
  ParcelEventType,
  ParcelStatus,
  PaymentResponsibility,
  PlatformRole,
  ServiceAreaStatus,
  ShipmentPickupType,
} from '@eveider/domain';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type NotificationChannel = 'sms' | 'push' | 'in_app';
export type ParcelInviteStatus = 'pending' | 'accepted' | 'expired';
export type BusinessTeamInviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type PlatformAdminInvite = {
  id: string;
  token: string;
  email: string;
  invitedRole: PlatformRole;
  invitedByUserId: string | null;
  status: BusinessTeamInviteStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessType =
  | 'registered_company'
  | 'individual_seller'
  | 'marketplace'
  | 'enterprise_partner';

export type RiskClassification = 'registered_business' | 'individual_seller';

export type DocumentType =
  | 'rccm_certificate'
  | 'nif_certificate'
  | 'legal_rep_id'
  | 'national_id'
  | 'selfie'
  | 'business_license'
  | 'proof_of_address';

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'correction_requested';

export type LocationType = 'business_address' | 'warehouse' | 'pickup_point';
export type PickupMethod = 'courier_pickup' | 'merchant_dropoff';
export type DeliveryPaymentRule = 'merchant_pays' | 'customer_pays' | 'depends_on_order';
export type SettlementMethod =
  | 'mobile_money_airtel'
  | 'mobile_money_orange'
  | 'mobile_money_mpesa'
  | 'bank_transfer';
export type BillingType = 'pay_per_shipment' | 'monthly_invoice';
export type CheckType =
  | 'PHONE_VERIFIED'
  | 'IDENTITY_MATCHED'
  | 'DOCUMENT_VALID'
  | 'ADDRESS_CONFIRMED'
  | 'COMPANY_REGISTERED'
  | 'BANK_ACCOUNT_VERIFIED';
export type CheckStatus = 'PASS' | 'FAIL' | 'PENDING';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'correction_requested';
export type FeatureName = 'CREATE_SHIPMENT' | 'API_ACCESS' | 'COD' | 'MONTHLY_INVOICE';
export type PermissionStatus = 'ENABLED' | 'DISABLED';

export type User = {
  id: string;
  authId: string;
  platformRole: PlatformRole | null;
  isCustomer: boolean;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  isBlocked: boolean;
  deactivatedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationMembership = {
  id: string;
  userId: string;
  businessId: string;
  role: OrganizationRole;
  createdAt: Date;
  updatedAt: Date;
};

export type Business = {
  id: string;
  name: string;
  status: BusinessStatus;
  businessType: BusinessType | null;
  industry: string | null;
  salesChannels: string[];
  description: string | null;
  riskClassification: RiskClassification | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isPhoneVerified: boolean;
  otpCode: string | null;
  otpExpiresAt: Date | null;
  legalCompanyName: string | null;
  rccmNumber: string | null;
  nifNumber: string | null;
  dateCreated: Date | null;
  legalRepName: string | null;
  individualFullName: string | null;
  idPassportNumber: string | null;
  residentialAddress: string | null;
  accessCode: string | null;
  isPlatformOrg: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Locker = {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string | null;
  serviceAreaId: string | null;
  latitude: number | null;
  longitude: number | null;
  rows: number;
  columns: number;
  type: LockerType;
  maxCapacity: number | null;
  contactPhone: string | null;
  contactName: string | null;
  notes: string | null;
  commissionType: CommissionType | null;
  commissionValue: number | null;
  commissionCurrency: string | null;
  status: LockerStatus;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceArea = {
  id: string;
  code: string;
  name: string;
  city: string;
  status: ServiceAreaStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Compartment = {
  id: string;
  lockerId: string;
  label: string;
  size: CompartmentSize;
  status: CompartmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type Parcel = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  businessId: string;
  customerId: string | null;
  recipientPhone: string;
  recipientName: string | null;
  lockerId: string | null;
  compartmentId: string | null;
  pickupType: ShipmentPickupType;
  senderName: string;
  senderPhone: string;
  senderAddress: string | null;
  packageSize: PackageSize;
  packageLengthCm: number | null;
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  packageWeightKg: number | null;
  packageCategory: PackageCategory;
  declaredValueCdf: number | null;
  declaredValueUsd: number | null;
  paymentResponsibility: PaymentResponsibility;
  codAmountCdf: number | null;
  codAmountUsd: number | null;
  deliveryFeeAmount: number | null;
  deliveryFeeCurrency: 'USD' | 'CDF';
  deliveryDistanceKm: number | null;
  pricingSizeUsed: PackageSize | null;
  readyForPickupAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DeliveryPricingRuleRow = {
  id: string;
  distanceThresholdKm: number;
  belowThresholdAmount: number;
  aboveThresholdAmount: number;
  currency: 'USD' | 'CDF';
  smallCoefficient: number;
  mediumCoefficient: number;
  largeCoefficient: number;
  dropOffFeeAmount: number;
  lockerRentalRateAmount: number;
  updatedAt: Date;
  updatedBy: string | null;
};

export type ParcelCharge = {
  id: string;
  parcelId: string;
  businessId: string;
  kind: 'delivery_fee' | 'drop_off_fee' | 'locker_rental';
  status: 'pending' | 'owed' | 'void';
  amount: number;
  currency: 'USD' | 'CDF';
  unitRate: number | null;
  quantity: number | null;
  periodStartedAt: Date | null;
  periodEndedAt: Date | null;
  lockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LockerNetworkSettingsRow = {
  id: string;
  sizeMatchingMode: 'exact' | 'exact_or_larger';
  assignmentStrategy: 'smallest_fit' | 'first_available' | 'preferred_size';
  pickupHoldHours: number;
  pickupReminderHours: number;
  updatedAt: Date;
  updatedBy: string | null;
};

export type LockerLayoutTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  rows: number;
  columns: number;
  cells: { label: string; size: CompartmentSize }[];
  isStarter: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
};

export type Delivery = {
  id: string;
  parcelId: string;
  driverId: string;
  /** @deprecated alias of driverId */
  courierId: string;
  kind: DeliveryKind;
  status: DeliveryStatus;
  scannedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PickupPin = {
  id: string;
  parcelId: string;
  code: string;
  expiresAt: Date | null;
  createdAt: Date;
};

export type Notification = {
  id: string;
  userId: string | null;
  parcelId: string | null;
  channel: NotificationChannel;
  message: string;
  sentAt: Date | null;
  createdAt: Date;
};

export type Issue = {
  id: string;
  type: IssueType;
  status: IssueStatus;
  parcelId: string | null;
  lockerId: string | null;
  reporterId: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ParcelInvite = {
  id: string;
  token: string;
  parcelId: string;
  phone: string;
  email: string | null;
  status: ParcelInviteStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

export type BusinessTeamInvite = {
  id: string;
  token: string;
  businessId: string;
  email: string;
  invitedRole: OrganizationRole;
  invitedByUserId: string | null;
  status: BusinessTeamInviteStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ParcelPayment = {
  id: string;
  parcelId: string;
  userId: string | null;
  depositId: string;
  amount: string;
  currency: string;
  provider: string;
  phoneNumber: string;
  status: PaymentStatus;
  pawapayStatus: string | null;
  failureReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessLocation = {
  id: string;
  businessId: string;
  type: LocationType;
  pickupMethod: PickupMethod;
  country: string;
  city: string;
  street: string;
  lat: number | null;
  lng: number | null;
  contactPerson: string | null;
  contactPhone: string | null;
  availableDays: string | null;
  availableHours: string | null;
  dropoffLockerId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessDocument = {
  id: string;
  businessId: string;
  type: DocumentType;
  fileUrl: string;
  fileName: string | null;
  status: DocumentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BillingAccount = {
  id: string;
  businessId: string;
  paymentRule: DeliveryPaymentRule;
  billingType: BillingType;
  createdAt: Date;
  updatedAt: Date;
};

export type SettlementAccount = {
  id: string;
  businessId: string;
  payoutMethod: SettlementMethod;
  accountHolder: string;
  accountNumber: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessPermission = {
  id: string;
  businessId: string;
  feature: FeatureName;
  status: PermissionStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessLimit = {
  id: string;
  businessId: string;
  dailyShipments: number | null;
  monthlyShipments: number | null;
  maxPackageValueUsd: number | null;
  codDailyLimitUsd: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessStatusHistory = {
  id: string;
  businessId: string;
  previousStatus: BusinessStatus;
  newStatus: BusinessStatus;
  changedBy: string | null;
  reason: string | null;
  createdAt: Date;
};

export type ParcelEvent = {
  id: string;
  parcelId: string;
  deliveryId: string | null;
  issueId: string | null;
  compartmentId: string | null;
  eventType: ParcelEventType;
  actorType: ParcelEventActorType;
  actorUserId: string | null;
  previousParcelStatus: ParcelStatus | null;
  newParcelStatus: ParcelStatus | null;
  previousDeliveryStatus: DeliveryStatus | null;
  newDeliveryStatus: DeliveryStatus | null;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type OrganizationApiKey = {
  id: string;
  businessId: string;
  name: string;
  keyPrefix: string;
  secretHash: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type OrganizationNotificationEndpoint = {
  id: string;
  businessId: string;
  url: string | null;
  signingSecret: string;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationNotificationDelivery = {
  id: string;
  endpointId: string;
  parcelId: string | null;
  eventId: string | null;
  eventType: string;
  status: 'sent' | 'failed';
  httpStatus: number | null;
  error: string | null;
  createdAt: Date;
};

export type BusinessVerification = {
  id: string;
  businessId: string;
  status: VerificationStatus;
  reviewerId: string | null;
  reviewNotes: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VerificationCheck = {
  id: string;
  businessVerificationId: string;
  type: CheckType;
  status: CheckStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CourierDossier = DriverDossier;
export type CourierDossierStatus = DriverDossierStatus;

export type DriverDossier = {
  id: string;
  contractorType: 'eveider' | 'business';
  businessId: string | null;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  idDocumentUrl: string;
  notes: string | null;
  reviewNotes: string | null;
  status: DriverDossierStatus;
  serviceAreaId: string | null;
  createdByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  invitedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
