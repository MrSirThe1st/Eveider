import { z } from 'zod';
import { businessStatusSchema } from '../schemas.js';

export const updateBusinessStatusSchema = z.object({
  status: businessStatusSchema,
});

export type UpdateBusinessStatusInput = z.infer<typeof updateBusinessStatusSchema>;
