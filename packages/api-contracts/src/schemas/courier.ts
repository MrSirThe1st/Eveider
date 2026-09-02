import { z } from 'zod';

export const createCourierDossierSchema = z.object({
  fullName: z.string().min(2, 'Nom requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().min(8).optional(),
  idDocumentUrl: z.string().url('URL de pièce d’identité requise'),
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

export type CreateCourierDossierInput = z.infer<typeof createCourierDossierSchema>;
export type ReviewCourierDossierInput = z.infer<typeof reviewCourierDossierSchema>;
