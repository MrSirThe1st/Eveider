import { createRepositories } from '@eveider/data-access';
import { buildTeamInviteLink } from '@eveider/data-access';
import type { DataAccessContext } from '@eveider/data-access';
import type { OrganizationRole } from '@eveider/domain';

export type TeamMemberView = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  userRole: OrganizationRole;
  isCurrentUser: boolean;
};

export type TeamInviteView = {
  id: string;
  email: string;
  invitedRole: OrganizationRole;
  status: string;
  expiresAt: string;
  inviteUrl: string;
};

export async function loadBusinessTeam(ctx: DataAccessContext, currentUserId: string) {
  const { teamInvites } = createRepositories();
  const [members, invites] = await Promise.all([
    teamInvites.listMembers(ctx),
    teamInvites.listPending(ctx),
  ]);

  return {
    members: members.map(
      (member): TeamMemberView => ({
        id: member.user.id,
        fullName: member.user.fullName,
        email: member.user.email,
        phone: member.user.phone,
        userRole: member.role,
        isCurrentUser: member.user.id === currentUserId,
      }),
    ),
    invites: invites.map(
      (invite): TeamInviteView => ({
        id: invite.id,
        email: invite.email,
        invitedRole: invite.invitedRole,
        status: invite.status,
        expiresAt: invite.expiresAt.toISOString(),
        inviteUrl: buildTeamInviteLink(invite.token),
      }),
    ),
  };
}
