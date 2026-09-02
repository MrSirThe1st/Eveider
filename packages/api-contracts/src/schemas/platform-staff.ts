import { z } from 'zod';
import { emailSchema } from './auth.js';

export const platformRoleSchema = z.enum(['super_admin', 'admin']);

export const invitePlatformStaffSchema = z.object({
  email: emailSchema,
  role: platformRoleSchema,
});

export const promotePlatformStaffSchema = z.object({
  email: emailSchema,
  role: platformRoleSchema,
});

export const updatePlatformStaffRoleSchema = z.object({
  role: platformRoleSchema,
});

export const inviteEveiderDispatcherSchema = z.object({
  email: emailSchema,
});

export const promoteEveiderDispatcherSchema = z.object({
  email: emailSchema,
});

export const updateEveiderTeamMemberRoleSchema = z.object({
  role: z.enum(['dispatcher']),
});

export const registerPlatformAdminSchema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  email: emailSchema,
  phone: z.string().min(8, 'Téléphone requis'),
  password: z.string().min(8, 'Mot de passe requis'),
  adminInviteToken: z.string().uuid('Invitation invalide'),
});

export const acceptPlatformAdminInviteSchema = z.object({
  token: z.string().uuid('Invitation invalide'),
});

export type InvitePlatformStaffInput = z.infer<typeof invitePlatformStaffSchema>;
export type PromotePlatformStaffInput = z.infer<typeof promotePlatformStaffSchema>;
export type UpdatePlatformStaffRoleInput = z.infer<typeof updatePlatformStaffRoleSchema>;
export type InviteEveiderDispatcherInput = z.infer<typeof inviteEveiderDispatcherSchema>;
export type PromoteEveiderDispatcherInput = z.infer<typeof promoteEveiderDispatcherSchema>;
export type UpdateEveiderTeamMemberRoleInput = z.infer<typeof updateEveiderTeamMemberRoleSchema>;
export type RegisterPlatformAdminInput = z.infer<typeof registerPlatformAdminSchema>;
export type AcceptPlatformAdminInviteInput = z.infer<typeof acceptPlatformAdminInviteSchema>;
