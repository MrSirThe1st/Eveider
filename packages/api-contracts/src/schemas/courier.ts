import { z } from 'zod';
import { storedDocumentRefSchema } from './documents.js';

export const createCourierDossierSchema = z.object({
  fullName: z.string().min(2, 'Nom requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().min(8).optional(),
  idDocumentUrl: storedDocumentRefSchema,
  notes: z.string().max(2000).optional(),
  contractorType: z.enum(['eveider', 'business']).optional(),
  businessId: z.string().uuid().optional(),
  serviceAreaId: z.string().uuid('Zone invalide').nullable().optional(),
});

export const updateCourierDossierSchema = createCourierDossierSchema.partial();

export const updateDriverServiceAreaSchema = z.object({
  serviceAreaId: z.string().uuid('Zone invalide').nullable(),
});

export const reviewCourierDossierSchema = z.object({
  status: z.enum(['approved', 'needs_correction', 'rejected']),
  reviewNotes: z.string().max(2000).optional(),
});

export const registerDriverSchema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().min(8, 'Téléphone requis'),
  password: z.string().min(8, 'Mot de passe requis'),
  driverInviteToken: z.string().uuid('Invitation invalide'),
});

export const acceptDriverInviteSchema = z.object({
  token: z.string().uuid('Invitation invalide'),
});

export type CreateCourierDossierInput = z.infer<typeof createCourierDossierSchema>;
export type ReviewCourierDossierInput = z.infer<typeof reviewCourierDossierSchema>;
export type RegisterDriverInput = z.infer<typeof registerDriverSchema>;
export type AcceptDriverInviteInput = z.infer<typeof acceptDriverInviteSchema>;
