import type { BusinessStatus } from '@eveider/domain';

export type OnboardingSummary = {
  id: string;
  name: string;
  status: BusinessStatus;
  businessType: string | null;
  riskClassification: string | null;
  industry: string | null;
  salesChannels: string[];
  description: string | null;
  legalCompanyName: string | null;
  rccmNumber: string | null;
  nifNumber: string | null;
  dateCreated: string | Date | null;
  legalRepName: string | null;
  individualFullName: string | null;
  idPassportNumber: string | null;
  residentialAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isPhoneVerified: boolean;
  locations: Array<{
    type: string;
    street: string | null;
    city: string | null;
    pickupMethod?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
    dropoffLockerId?: string | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    status: string;
    fileUrl: string;
    fileName: string | null;
  }>;
  permissions: Array<{ feature: string; status: string }>;
  limit: {
    dailyShipments: number;
    maxPackageValueUsd: number;
    codDailyLimitUsd: number;
  } | null;
  users: Array<{
    fullName: string | null;
    email: string | null;
    phone: string | null;
    userRole: string | null;
  }>;
  verifications: Array<{
    reviewNotes?: string | null;
    checks: Array<{ type: string; status: string }>;
  }>;
  billingAccount?: {
    paymentRule: 'merchant_pays' | 'customer_pays' | 'depends_on_order';
    billingType: 'pay_per_shipment' | 'monthly_invoice';
  } | null;
  settlementAccount?: {
    payoutMethod: 'mobile_money_airtel' | 'mobile_money_orange' | 'mobile_money_mpesa' | 'bank_transfer';
    accountHolder: string | null;
    accountNumber: string | null;
  } | null;
};
