import { createRepositories, buildTeamInviteLink, type DataAccessContext } from '@eveider/data-access';
import { ORGANIZATION_ROLE_LABELS, type OrganizationRole } from '@eveider/domain';
import { loadAdminDriverRoster, type DriverListItem } from '@/server/drivers';
import { requirePlatformOrganizationId, withPlatformOrgContext } from '@/server/platform-staff';

export type EveiderTeamMemberView = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: OrganizationRole;
  roleLabel: string;
  isCurrentUser: boolean;
  driverProfileId: string | null;
  driverStatusLabel: string | null;
  currentDelivery: string | null;
};

export type EveiderTeamInviteView = {
  id: string;
  email: string;
  invitedRole: OrganizationRole;
  invitedRoleLabel: string;
  expiresAt: string;
  inviteUrl: string;
};

export async function loadEveiderTeamPage(ctx: DataAccessContext, currentUserId: string) {
  const platformOrgId = await requirePlatformOrganizationId();
  const platformCtx = withPlatformOrgContext(ctx, platformOrgId);
  const { memberships, teamInvites } = createRepositories();

  const [operationalMembers, pendingInvites, driverRoster] = await Promise.all([
    memberships.listOperationalMembers(platformOrgId),
    teamInvites.listPending(platformCtx),
    loadAdminDriverRoster(ctx),
  ]);

  const eveiderDrivers = driverRoster.filter((driver) => driver.organizationKey === 'eveider');

  const dispatchers = operationalMembers
    .filter((member) => member.role === 'dispatcher')
    .map((member) => toMemberView(member, currentUserId, null));

  const driversFromMembership = operationalMembers
    .filter((member) => member.role === 'driver')
    .map((member) => {
      const dossier = [...eveiderDrivers].find((row) => row.email === member.user.email);
      return toMemberView(member, currentUserId, dossier ?? null);
    });

  const driversFromRosterOnly = eveiderDrivers
    .filter(
      (driver) =>
        !operationalMembers.some(
          (member) => member.role === 'driver' && member.user.email === driver.email,
        ),
    )
    .map(
      (driver): EveiderTeamMemberView => ({
        id: driver.id,
        fullName: driver.fullName,
        email: driver.email,
        phone: null,
        role: 'driver',
        roleLabel: ORGANIZATION_ROLE_LABELS.driver,
        isCurrentUser: false,
        driverProfileId: driver.id,
        driverStatusLabel: driver.statusLabel,
        currentDelivery: driver.currentDelivery,
      }),
    );

  return {
    canManage: true,
    dispatchers,
    drivers: [...driversFromMembership, ...driversFromRosterOnly].filter(
      (driver, index, list) => list.findIndex((item) => item.email === driver.email) === index,
    ),
    invites: pendingInvites
      .filter((invite) => invite.invitedRole === 'dispatcher')
      .map(
        (invite): EveiderTeamInviteView => ({
          id: invite.id,
          email: invite.email,
          invitedRole: invite.invitedRole,
          invitedRoleLabel: ORGANIZATION_ROLE_LABELS[invite.invitedRole],
          expiresAt: invite.expiresAt.toISOString(),
          inviteUrl: buildTeamInviteLink(invite.token),
        }),
      ),
    addDriverHref: '/tableau-de-bord/chauffeurs/nouveau',
  };
}

function toMemberView(
  member: { user: { id: string; fullName: string | null; email: string | null; phone: string | null }; role: OrganizationRole },
  currentUserId: string,
  driver: DriverListItem | null,
): EveiderTeamMemberView {
  return {
    id: member.user.id,
    fullName: member.user.fullName,
    email: member.user.email,
    phone: member.user.phone,
    role: member.role,
    roleLabel: ORGANIZATION_ROLE_LABELS[member.role],
    isCurrentUser: member.user.id === currentUserId,
    driverProfileId: driver?.id ?? null,
    driverStatusLabel: driver?.statusLabel ?? null,
    currentDelivery: driver?.currentDelivery ?? null,
  };
}
