import { z } from 'zod';

export const createOrganizationApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});

export const updateNotificationEndpointSchema = z.object({
  url: z
    .union([z.string().trim().max(2048), z.null()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }),
});
