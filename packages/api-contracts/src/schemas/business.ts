import { z } from 'zod';
import { businessStatusSchema } from '../schemas.js';
import { emailSchema, phoneSchema } from './auth.js';

export const updateBusinessStatusSchema = z.object({
  status: businessStatusSchema,
  reason: z.string().optional(),
});

export const updateBusinessProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom requis').max(80).optional(),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
});

export const businessUserRoleSchema = z.enum(['account_owner', 'admin', 'dispatcher', 'driver']);
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

const organizationNameSchema = z.string().trim().min(2, 'Nom de l’organisation requis');
const industrySchema = z.string().trim().min(2, 'Secteur d’activité requis');

// Step 1: Create Account
export const registerBusinessAccountSchema = z
  .object({
    firstName: z.string().min(2, 'Prénom requis'),
    lastName: z.string().min(2, 'Nom requis'),
    email: emailSchema,
    phone: phoneSchema,
    password: z.string().min(8, '8 caractères minimum'),
    organizationName: organizationNameSchema.optional(),
    industry: industrySchema.optional(),
    inviteToken: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.inviteToken) return;
    if (!value.organizationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nom de l’organisation requis',
        path: ['organizationName'],
      });
    }
    if (!value.industry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secteur d’activité requis',
        path: ['industry'],
      });
    }
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

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(phoneSchema.optional());

export const updateBusinessSettingsSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom requis').max(80).optional(),
  name: z.string().trim().min(2, 'Nom entreprise requis'),
  businessType: businessTypeSchema.optional(),
  industry: z.string().trim().min(2, 'Secteur requis').optional(),
  description: z.string().optional(),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  country: z.string().trim().min(2).default('RDC'),
  city: z.string().trim().min(2, 'Ville requise'),
  address: z.string().trim().min(5, 'Adresse requise'),
  legalCompanyName: z.string().trim().optional(),
  rccmNumber: z.string().trim().optional(),
  nifNumber: z.string().trim().optional(),
  legalRepName: z.string().trim().optional(),
  pickupMethod: pickupMethodSchema,
  pickupAddress: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  pickupContactPhone: optionalPhone,
  availableDays: z.string().trim().optional(),
  availableHours: z.string().trim().optional(),
  dropoffLockerId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(z.string().uuid().optional()),
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
export const adminReviewDecisionSchema = z
  .object({
    action: z.enum(['approve', 'request_correction', 'block']),
    reviewNotes: z.string().optional(),
    checks: z
      .array(
        z.object({
          type: checkTypeSchema,
          status: checkStatusSchema,
          /** Required when status is FAIL — reason code + optional free text. */
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
  })
  .superRefine((value, ctx) => {
    for (const [index, check] of (value.checks ?? []).entries()) {
      if (check.status === 'FAIL' && !check.notes?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Motif requis pour le contrôle en échec (${check.type})`,
          path: ['checks', index, 'notes'],
        });
      }
    }
    for (const [index, feedback] of (value.documentsFeedback ?? []).entries()) {
      if (
        (feedback.status === 'correction_requested' || feedback.status === 'rejected') &&
        !feedback.notes?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Motif requis pour chaque document à corriger',
          path: ['documentsFeedback', index, 'notes'],
        });
      }
    }
  });

export type UpdateBusinessStatusInput = z.infer<typeof updateBusinessStatusSchema>;
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
export type UpdateBusinessSettingsInput = z.infer<typeof updateBusinessSettingsSchema>;
export type RegisterBusinessAccountInput = z.infer<typeof registerBusinessAccountSchema>;

export const inviteTeamMemberSchema = z.object({
  email: emailSchema,
  role: businessUserRoleSchema,
});

export const updateTeamMemberRoleSchema = z.object({
  role: businessUserRoleSchema,
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type UpdateTeamMemberRoleInput = z.infer<typeof updateTeamMemberRoleSchema>;

export const registerBusinessAccountResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    authId: z.string().uuid(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    fullName: z.string().nullable(),
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
  joinedExistingCompany: z.boolean(),
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
