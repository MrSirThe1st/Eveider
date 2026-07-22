import { z } from 'zod';
import { businessStatusSchema } from '../schemas.js';
import { emailSchema, phoneSchema } from './auth.js';

export const updateBusinessStatusSchema = z.object({
  status: businessStatusSchema,
  reason: z.string().optional(),
});

export const businessUserRoleSchema = z.enum(['owner', 'manager', 'logistics_employee']);
export const businessTypeSchema = z.enum(['registered_company', 'individual_seller', 'marketplace', 'enterprise_partner']);
export const locationTypeSchema = z.enum(['business_address', 'warehouse', 'pickup_point']);
export const pickupMethodSchema = z.enum(['courier_pickup', 'merchant_dropoff']);
export const deliveryPaymentRuleSchema = z.enum(['merchant_pays', 'customer_pays', 'depends_on_order']);
export const settlementMethodSchema = z.enum(['mobile_money_airtel', 'mobile_money_orange', 'mobile_money_mpesa', 'bank_transfer']);
export const billingTypeSchema = z.enum(['pay_per_shipment', 'monthly_invoice']);
export const checkTypeSchema = z.enum([
  'PHONE_VERIFIED',
  'IDENTITY_MATCHED',
  'DOCUMENT_VALID',
  'ADDRESS_CONFIRMED',
  'COMPANY_REGISTERED',
  'BANK_ACCOUNT_VERIFIED',
]);
export const checkStatusSchema = z.enum(['PASS', 'FAIL', 'PENDING']);
export const documentTypeSchema = z.enum([
  'rccm_certificate',
  'nif_certificate',
  'legal_rep_id',
  'national_id',
  'selfie',
  'business_license',
  'proof_of_address',
]);

// Step 1: Create Account
export const registerBusinessAccountSchema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, '8 caractères minimum'),
  userRole: businessUserRoleSchema,
});

// Step 2: Verification Code
export const verifyBusinessPhoneOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Code à 6 chiffres requis'),
});

// Wizard Step 1: Business Information
export const businessInfoStepSchema = z.object({
  name: z.string().min(2, 'Nom entreprise requis'),
  businessType: businessTypeSchema,
  industry: z.string().min(2, 'Secteur d\'activité requis'),
  salesChannels: z.array(z.string()).min(1, 'Sélectionnez au moins un canal de vente'),
  description: z.string().optional(),
  country: z.string().default('RDC'),
  city: z.string().default('Kinshasa'),
  address: z.string().min(5, 'Adresse complète requise'),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Wizard Step 2: Legal Verification
export const legalVerificationStepSchema = z.object({
  isRegistered: z.boolean(),
  // Path A: Registered
  legalCompanyName: z.string().optional(),
  rccmNumber: z.string().optional(),
  nifNumber: z.string().optional(),
  dateCreated: z.string().optional(),
  legalRepName: z.string().optional(),
  // Path B: Individual
  individualFullName: z.string().optional(),
  idPassportNumber: z.string().optional(),
  residentialAddress: z.string().optional(),
  phone: phoneSchema.optional(),
  documents: z.array(
    z.object({
      type: documentTypeSchema,
      fileUrl: z.string().url('URL de fichier invalide'),
      fileName: z.string().optional(),
    }),
  ).optional(),
});

// Wizard Step 3: Logistics Operations Setup
export const operationsSetupStepSchema = z.object({
  pickupMethod: pickupMethodSchema,
  // Courier pickup details
  pickupAddress: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: phoneSchema.optional(),
  availableDays: z.string().optional(),
  availableHours: z.string().optional(),
  // Merchant drop-off details
  dropoffLockerId: z.string().uuid().optional(),
});

// Wizard Step 4: Payment & Settlement Setup
export const paymentSetupStepSchema = z.object({
  paymentRule: deliveryPaymentRuleSchema,
  payoutMethod: settlementMethodSchema,
  accountHolder: z.string().min(2, 'Titulaire du compte requis'),
  accountNumber: z.string().min(5, 'Numéro de compte / téléphone requis'),
  billingType: billingTypeSchema,
});

// Admin Review & Decision
export const adminReviewDecisionSchema = z.object({
  action: z.enum(['approve', 'request_correction', 'block']),
  reviewNotes: z.string().optional(),
  checks: z
    .array(
      z.object({
        type: checkTypeSchema,
        status: checkStatusSchema,
        notes: z.string().optional(),
      }),
    )
    .optional(),
  documentsFeedback: z
    .array(
      z.object({
        documentId: z.string().uuid(),
        status: z.enum(['approved', 'rejected', 'correction_requested']),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

export type UpdateBusinessStatusInput = z.infer<typeof updateBusinessStatusSchema>;
export type RegisterBusinessAccountInput = z.infer<typeof registerBusinessAccountSchema>;

export const registerBusinessAccountResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    authId: z.string().uuid(),
    role: z.string(),
    userRole: businessUserRoleSchema.nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    fullName: z.string().nullable(),
    businessId: z.string().uuid().nullable(),
    isBlocked: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }),
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: businessStatusSchema,
    contactPhone: z.string().nullable(),
    isPhoneVerified: z.boolean(),
  }),
});

export const verifyBusinessPhoneOtpResponseSchema = z.object({
  verified: z.literal(true),
  businessId: z.string().uuid(),
});

export type RegisterBusinessAccountResponse = z.infer<typeof registerBusinessAccountResponseSchema>;
export type VerifyBusinessPhoneOtpResponse = z.infer<typeof verifyBusinessPhoneOtpResponseSchema>;
export type VerifyBusinessPhoneOtpInput = z.infer<typeof verifyBusinessPhoneOtpSchema>;
export type BusinessInfoStepInput = z.infer<typeof businessInfoStepSchema>;
export type LegalVerificationStepInput = z.infer<typeof legalVerificationStepSchema>;
export type OperationsSetupStepInput = z.infer<typeof operationsSetupStepSchema>;
export type PaymentSetupStepInput = z.infer<typeof paymentSetupStepSchema>;
export type AdminReviewDecisionInput = z.infer<typeof adminReviewDecisionSchema>;
