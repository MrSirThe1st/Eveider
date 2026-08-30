import {
  createDataAccessContext,
  createRepositories,
  buildPlatformAdminInviteLink,
  buildTeamInviteLink,
  type DataAccessContext,
} from '@eveider/data-access';
import { isSuperAdmin, ORGANIZATION_ROLE_LABELS, PLATFORM_ROLE_LABELS, type PlatformRole } from '@eveider/domain';

export type PlatformStaffMemberView = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  platformRole: PlatformRole;
  platformRoleLabel: string;
  eveiderOrgRole: string | null;
  eveiderOrgRoleLabel: string | null;
  isCurrentUser: boolean;
};

export type PlatformStaffInviteView = {
  id: string;
  email: string;
  invitedRole: PlatformRole;
  invitedRoleLabel: string;
  expiresAt: string;
  inviteUrl: string;
};

export async function loadPlatformStaffPage(ctx: DataAccessContext, currentUserId: string) {
  const { platformStaff } = createRepositories();
  const [members, invites] = await Promise.all([
    platformStaff.listStaff(),
    platformStaff.listPendingInvites(ctx),
  ]);

  return {
    canManage: isSuperAdmin(ctx.platformRole),
    members: members.map(
      (member): PlatformStaffMemberView => ({
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        platformRole: member.platformRole!,
        platformRoleLabel: PLATFORM_ROLE_LABELS[member.platformRole!],
        eveiderOrgRole: member.eveiderOrgRole,
        eveiderOrgRoleLabel: member.eveiderOrgRole
          ? ORGANIZATION_ROLE_LABELS[member.eveiderOrgRole as keyof typeof ORGANIZATION_ROLE_LABELS]
          : null,
        isCurrentUser: member.id === currentUserId,
      }),
    ),
    invites: invites.map(
      (invite): PlatformStaffInviteView => ({
        id: invite.id,
        email: invite.email,
        invitedRole: invite.invitedRole,
        invitedRoleLabel: PLATFORM_ROLE_LABELS[invite.invitedRole],
        expiresAt: invite.expiresAt.toISOString(),
        inviteUrl: buildPlatformAdminInviteLink(invite.token),
      }),
    ),
  };
}

export function withPlatformOrgContext(
  ctx: DataAccessContext,
  platformOrgId: string,
): DataAccessContext {
  return createDataAccessContext({
    userId: ctx.userId,
    platformRole: ctx.platformRole,
    isCustomer: ctx.isCustomer,
    organizationId: platformOrgId,
    organizationRole: 'admin',
    memberships: ctx.memberships,
    businessId: platformOrgId,
  });
}

export async function requirePlatformOrganizationId(): Promise<string> {
  const { businesses } = createRepositories();
  const org = await businesses.findPlatformOrganization();
  if (!org) {
    throw new Error('Organisation Eveider introuvable');
  }
  return org.id;
}
