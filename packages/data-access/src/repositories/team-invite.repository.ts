import {
  INVITABLE_ORGANIZATION_ROLES,
  isAccountOwnerRole,
  isOrganizationAdminRole,
  type OrganizationRole,
} from '@eveider/domain';
import { createSupabaseAdminClient } from '../supabase/server.js';
import { AccessDeniedError, assertBusinessRole, assertCompanyPermission, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapBusinessTeamInvite, mapUser } from '../db/mappers.js';
import type { BusinessTeamInvite, User } from '../db/types.js';
import { buildTeamInviteLink } from '../invitations/invite-links.js';
import { OrganizationMembershipRepository } from './organization-membership.repository.js';
import { UserRepository } from './user.repository.js';

const TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TEAM_INVITE_EXPIRY_DAYS = 14;

export type TeamInvitePreview = {
  businessId: string;
  businessName: string;
  email: string;
  invitedRole: OrganizationRole;
  expiresAt: string;
};

export type TeamInviteDelivery = {
  invite: BusinessTeamInvite;
  inviteUrl: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getExpiryDate(from = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + TEAM_INVITE_EXPIRY_DAYS);
  return expires;
}

function assertInvitableRole(role: OrganizationRole): void {
  if (!INVITABLE_ORGANIZATION_ROLES.includes(role)) {
    throw new Error('Ce rôle ne peut pas être invité. Le propriétaire se transmet.');
  }
}

export class TeamInviteRepository {
  private readonly users: UserRepository;
  private readonly memberships: OrganizationMembershipRepository;

  constructor(
    private readonly db: Queryable,
    users?: UserRepository,
    memberships?: OrganizationMembershipRepository,
  ) {
    this.users = users ?? new UserRepository(db);
    this.memberships = memberships ?? new OrganizationMembershipRepository(db);
  }

  async findByToken(token: string): Promise<BusinessTeamInvite | null> {
    if (!TOKEN_RE.test(token)) return null;
    const result = await this.db.query(
      `SELECT * FROM business_team_invites WHERE token = $1 LIMIT 1`,
      [token],
    );
    const row = result.rows[0];
    return row ? mapBusinessTeamInvite(row) : null;
  }

  async getPreview(token: string): Promise<TeamInvitePreview | null> {
    const invite = await this.findByToken(token);
    if (!invite) return null;
    if (invite.status === 'revoked') {
      throw new Error('Cette invitation a été révoquée');
    }
    if (invite.status === 'accepted') {
      throw new Error('Cette invitation a déjà été utilisée');
    }
    if (invite.status === 'expired' || invite.expiresAt.getTime() < Date.now()) {
      if (invite.status === 'pending') {
        await this.db.query(
          `UPDATE business_team_invites SET status = 'expired', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
          [invite.id],
        );
      }
      throw new Error('Cette invitation a expiré');
    }

    const business = await this.db.query(`SELECT name FROM businesses WHERE id = $1 LIMIT 1`, [
      invite.businessId,
    ]);
    if (!business.rows[0]) return null;

    return {
      businessId: invite.businessId,
      businessName: String(business.rows[0].name),
      email: invite.email,
      invitedRole: invite.invitedRole,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async listPending(ctx: DataAccessContext): Promise<BusinessTeamInvite[]> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_team');
    const result = await this.db.query(
      `SELECT * FROM business_team_invites
       WHERE business_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [ctx.businessId],
    );
    return result.rows.map(mapBusinessTeamInvite);
  }

  async listMembers(ctx: DataAccessContext): Promise<Array<{ user: User; role: OrganizationRole }>> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_team');
    const result = await this.db.query(
      `SELECT u.*, m.role AS membership_role
       FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
       WHERE m.business_id = $1 AND m.role <> 'driver'
       ORDER BY u.full_name ASC NULLS LAST`,
      [ctx.businessId],
    );
    return result.rows.map((row) => ({
      user: mapUser(row),
      role: row.membership_role as OrganizationRole,
    }));
  }

  async invite(
    ctx: DataAccessContext,
    input: { email: string; role: OrganizationRole },
  ): Promise<TeamInviteDelivery> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_team');
    assertInvitableRole(input.role);

    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);
    if (existing) {
      const already = await this.memberships.find(existing.id, ctx.businessId!);
      if (already) {
        throw new Error('Cette personne fait déjà partie de l’équipe');
      }
    }

    const pending = await this.db.query(
      `SELECT id FROM business_team_invites
       WHERE business_id = $1 AND lower(email) = $2 AND status = 'pending'
       LIMIT 1`,
      [ctx.businessId, email],
    );
    if (pending.rows[0]) {
      throw new Error('Une invitation est déjà en attente pour cette adresse');
    }

    const inserted = await this.db.query(
      `INSERT INTO business_team_invites (business_id, email, invited_role, invited_by_user_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ctx.businessId, email, input.role, ctx.userId ?? null, getExpiryDate()],
    );
    const invite = mapBusinessTeamInvite(inserted.rows[0]!);
    const inviteUrl = buildTeamInviteLink(invite.token);
    await this.sendPasswordlessInvite(email, inviteUrl);
    return { invite, inviteUrl };
  }

  async resend(ctx: DataAccessContext, inviteId: string): Promise<TeamInviteDelivery> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_team');
    const current = await this.requireInviteInBusiness(ctx.businessId!, inviteId);
    if (current.status !== 'pending') {
      throw new Error('Seule une invitation en attente peut être renvoyée');
    }

    const updated = await this.db.query(
      `UPDATE business_team_invites
       SET token = gen_random_uuid(), expires_at = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [inviteId, getExpiryDate()],
    );
    const invite = mapBusinessTeamInvite(updated.rows[0]!);
    const inviteUrl = buildTeamInviteLink(invite.token);
    await this.sendPasswordlessInvite(invite.email, inviteUrl);
    return { invite, inviteUrl };
  }

  async revoke(ctx: DataAccessContext, inviteId: string): Promise<void> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_team');
    await this.requireInviteInBusiness(ctx.businessId!, inviteId);
    await this.db.query(
      `UPDATE business_team_invites
       SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND business_id = $2 AND status = 'pending'`,
      [inviteId, ctx.businessId],
    );
  }

  async acceptForUser(input: {
    token: string;
    email: string;
    userId: string;
  }): Promise<{ invite: BusinessTeamInvite; businessId: string }> {
    const preview = await this.getPreview(input.token);
    if (!preview) {
      throw new Error('Invitation introuvable');
    }
    if (normalizeEmail(input.email) !== normalizeEmail(preview.email)) {
      throw new Error('Cette invitation est destinée à une autre adresse email');
    }

    const invite = await this.findByToken(input.token);
    if (!invite) throw new Error('Invitation introuvable');

    await this.memberships.upsert({
      userId: input.userId,
      businessId: invite.businessId,
      role: invite.invitedRole,
    });

    await this.db.query(
      `UPDATE business_team_invites
       SET status = 'accepted', accepted_at = NOW(), accepted_user_id = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [invite.id, input.userId],
    );

    return { invite, businessId: invite.businessId };
  }

  async acceptForNewUser(input: {
    token: string;
    email: string;
    userId: string;
  }): Promise<{ invite: BusinessTeamInvite; businessId: string }> {
    return this.acceptForUser(input);
  }

  async updateMemberRole(
    ctx: DataAccessContext,
    memberId: string,
    role: OrganizationRole,
  ): Promise<User> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_team');
    assertInvitableRole(role);
    const member = await this.requireMember(ctx.businessId!, memberId);
    const membership = await this.memberships.find(member.id, ctx.businessId!);
    if (!membership) throw new Error('Membre introuvable');
    if (isAccountOwnerRole(membership.role)) {
      throw new Error('Transférez d’abord la propriété pour changer le rôle du propriétaire');
    }

    if (isOrganizationAdminRole(membership.role) && role !== 'admin') {
      const remaining = await this.users.countCompanyAdmins(ctx.businessId!, memberId);
      if (remaining < 1) {
        throw new Error('L’organisation doit conserver au moins un administrateur');
      }
    }

    await this.memberships.updateRole(memberId, ctx.businessId!, role);
    return this.users.findById(memberId).then((user) => {
      if (!user) throw new Error('Membre introuvable');
      return user;
    });
  }

  async removeMember(ctx: DataAccessContext, memberId: string): Promise<void> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_team');
    if (memberId === ctx.userId) {
      throw new AccessDeniedError('Vous ne pouvez pas retirer votre propre compte');
    }

    const membership = await this.memberships.find(memberId, ctx.businessId!);
    if (!membership) throw new Error('Membre introuvable');
    if (isAccountOwnerRole(membership.role)) {
      throw new Error('Le propriétaire doit d’abord transférer la propriété');
    }

    if (isOrganizationAdminRole(membership.role)) {
      const remaining = await this.users.countCompanyAdmins(ctx.businessId!, memberId);
      if (remaining < 1) {
        throw new Error('L’organisation doit conserver au moins un administrateur');
      }
    }

    await this.memberships.remove(memberId, ctx.businessId!);
  }

  async transferOwnership(ctx: DataAccessContext, memberId: string): Promise<void> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'transfer_ownership');
    if (!ctx.userId) throw new AccessDeniedError('Utilisateur requis');
    await this.memberships.transferOwnership({
      businessId: ctx.businessId!,
      fromUserId: ctx.userId,
      toUserId: memberId,
    });
  }

  private async sendPasswordlessInvite(email: string, inviteUrl: string): Promise<void> {
    try {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: inviteUrl },
      });
      if (error) {
        console.info('[eveider:team-invite:magic-link-fallback]', { email, inviteUrl, error: error.message });
      }
    } catch {
      console.info('[eveider:team-invite:simulated]', { email, inviteUrl });
    }
  }

  private async requireInviteInBusiness(
    businessId: string,
    inviteId: string,
  ): Promise<BusinessTeamInvite> {
    const result = await this.db.query(
      `SELECT * FROM business_team_invites WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [inviteId, businessId],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Invitation introuvable');
    return mapBusinessTeamInvite(row);
  }

  private async requireMember(businessId: string, memberId: string): Promise<User> {
    const member = await this.users.findById(memberId);
    const membership = member ? await this.memberships.find(member.id, businessId) : null;
    if (!member || !membership) {
      throw new Error('Membre introuvable');
    }
    return member;
  }
}
