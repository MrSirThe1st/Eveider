import { z } from 'zod';
import { issueStatusSchema, issueTypeSchema } from '../schemas.js';

export const createIssueSchema = z.object({
  type: issueTypeSchema,
  parcelId: z.string().uuid('Colis invalide').optional(),
  lockerId: z.string().uuid('Casier invalide').optional(),
  description: z.string().trim().min(1, 'Description requise').max(2000),
});

export const updateIssueStatusSchema = z.object({
  status: issueStatusSchema,
});

export const listIssuesQuerySchema = z.object({
  status: issueStatusSchema.optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
