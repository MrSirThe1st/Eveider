import { PLATFORM_ROLE_LABELS, type PlatformRole } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapPlatformAdminInvite, mapUser } from '../db/mappers.js';
import type { PlatformAdminInvite, User } from '../db/types.js';
import {
  AccessDeniedError,
  assertAdmin,
  assertSuperAdmin,
  type DataAccessContext,
} from '../context.js';
import { buildPlatformAdminInviteLink } from '../invitations/invite-links.js';
import { sendPlatformAdminInviteEmail } from '../messaging/platform-admin-invite-email.js';
import { UserRepository } from './user.repository.js';

const TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const INVITE_EXPIRY_DAYS = 14;

export type PlatformStaffMember = User & {
  eveiderOrgRole: string | null;
};

export type PlatformAdminInviteDelivery = {
  invite: PlatformAdminInvite;
  inviteUrl: string;
};

export type PlatformAdminInvitePreview = {
  email: string;
  invitedRole: PlatformRole;
  expiresAt: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getExpiryDate(from = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);
  return expires;
}

export class PlatformStaffRepository {
  private readonly users: UserRepository;

  constructor(
    private readonly db: Queryable,
    users?: UserRepository,
  ) {
    this.users = users ?? new UserRepository(db);
  }

  async listStaff(): Promise<PlatformStaffMember[]> {
    const result = await this.db.query(
      `SELECT u.*,
              om.role AS eveider_org_role
       FROM users u
       LEFT JOIN organization_memberships om
         ON om.user_id = u.id
        AND om.business_id = (SELECT id FROM businesses WHERE is_platform_org = true LIMIT 1)
       WHERE u.platform_role IS NOT NULL
       ORDER BY CASE WHEN u.platform_role = 'super_admin' THEN 0 ELSE 1 END,
                u.full_name ASC NULLS LAST`,
    );
    return result.rows.map((row) => ({
      ...mapUser(row),
      eveiderOrgRole: row.eveider_org_role == null ? null : String(row.eveider_org_role),
    }));
  }

  async listPendingInvites(ctx: DataAccessContext): Promise<PlatformAdminInvite[]> {
    assertAdmin(ctx);
    const result = await this.db.query(
      `SELECT * FROM platform_admin_invites
       WHERE status = 'pending'
       ORDER BY created_at DESC`,
    );
    return result.rows.map(mapPlatformAdminInvite);
  }

  async invite(
    ctx: DataAccessContext,
    input: { email: string; role: PlatformRole },
  ): Promise<PlatformAdminInviteDelivery> {
    assertSuperAdmin(ctx);

    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);
    if (existing?.platformRole) {
      throw new Error('Cette personne est déjà administrateur plateforme');
    }

    const pending = await this.db.query(
      `SELECT id FROM platform_admin_invites
       WHERE lower(email) = $1 AND status = 'pending'
       LIMIT 1`,
      [email],
    );
    if (pending.rows[0]) {
      throw new Error('Une invitation est déjà en attente pour cette adresse');
    }

    const inserted = await this.db.query(
      `INSERT INTO platform_admin_invites (email, invited_role, invited_by_user_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, input.role, ctx.userId ?? null, getExpiryDate()],
    );
    const invite = mapPlatformAdminInvite(inserted.rows[0]!);
    const inviteUrl = buildPlatformAdminInviteLink(invite.token);
    try {
      await sendPlatformAdminInviteEmail({
        to: invite.email,
        roleLabel: PLATFORM_ROLE_LABELS[invite.invitedRole],
        inviteUrl,
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      await this.db.query(
        `DELETE FROM platform_admin_invites WHERE id = $1 AND status = 'pending'`,
        [invite.id],
      );
      throw error;
    }
    return { invite, inviteUrl };
  }

  async promoteExisting(
    ctx: DataAccessContext,
    input: { email: string; role: PlatformRole },
  ): Promise<User> {
    assertSuperAdmin(ctx);
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw new Error('Aucun compte trouvé pour cette adresse email');
    }
    if (user.platformRole) {
      throw new Error('Cette personne est déjà administrateur plateforme');
    }
    return this.users.updateProfile(user.id, { platformRole: input.role });
  }

  async updateRole(
    ctx: DataAccessContext,
    userId: string,
    role: PlatformRole,
  ): Promise<User> {
    assertSuperAdmin(ctx);
    if (userId === ctx.userId) {
      throw new AccessDeniedError('Vous ne pouvez pas modifier votre propre rôle');
    }

    const user = await this.users.findById(userId);
    if (!user?.platformRole) {
      throw new Error('Administrateur introuvable');
    }

    if (user.platformRole === 'super_admin' && role === 'admin') {
      await this.assertCanDemoteSuperAdmin(userId);
    }

    return this.users.updateProfile(userId, { platformRole: role });
  }

  async revokeAccess(ctx: DataAccessContext, userId: string): Promise<User> {
    assertSuperAdmin(ctx);
    if (userId === ctx.userId) {
      throw new AccessDeniedError('Vous ne pouvez pas révoquer votre propre accès');
    }

    const user = await this.users.findById(userId);
    if (!user?.platformRole) {
      throw new Error('Administrateur introuvable');
    }

    if (user.platformRole === 'super_admin') {
      await this.assertCanDemoteSuperAdmin(userId);
    }

    return this.users.updateProfile(userId, { platformRole: null });
  }

  async resendInvite(ctx: DataAccessContext, inviteId: string): Promise<PlatformAdminInviteDelivery> {
    assertSuperAdmin(ctx);
    const current = await this.requirePendingInvite(inviteId);
    const updated = await this.db.query(
      `UPDATE platform_admin_invites
       SET token = gen_random_uuid(), expires_at = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [inviteId, getExpiryDate()],
    );
    const invite = mapPlatformAdminInvite(updated.rows[0]!);
    const inviteUrl = buildPlatformAdminInviteLink(invite.token);
    await sendPlatformAdminInviteEmail({
      to: invite.email,
      roleLabel: PLATFORM_ROLE_LABELS[invite.invitedRole],
      inviteUrl,
      expiresAt: invite.expiresAt,
    });
    return { invite, inviteUrl };
  }

  async revokeInvite(ctx: DataAccessContext, inviteId: string): Promise<void> {
    assertSuperAdmin(ctx);
    await this.requirePendingInvite(inviteId);
    await this.db.query(
      `UPDATE platform_admin_invites
       SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [inviteId],
    );
  }

  async getPreview(token: string): Promise<PlatformAdminInvitePreview | null> {
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
          `UPDATE platform_admin_invites SET status = 'expired', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
          [invite.id],
        );
      }
      throw new Error('Cette invitation a expiré');
    }
    return {
      email: invite.email,
      invitedRole: invite.invitedRole,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptForUser(input: {
    token: string;
    email: string;
    userId: string;
  }): Promise<PlatformAdminInvite> {
    const preview = await this.getPreview(input.token);
    if (!preview) {
      throw new Error('Invitation introuvable');
    }
    if (normalizeEmail(input.email) !== normalizeEmail(preview.email)) {
      throw new Error('Cette invitation est destinée à une autre adresse email');
    }

    const invite = await this.findByToken(input.token);
    if (!invite) throw new Error('Invitation introuvable');

    const user = await this.users.findById(input.userId);
    if (!user) throw new Error('Utilisateur introuvable');
    if (user.platformRole) {
      throw new Error('Ce compte est déjà administrateur plateforme');
    }

    await this.users.updateProfile(input.userId, { platformRole: invite.invitedRole });
    await this.db.query(
      `UPDATE platform_admin_invites
       SET status = 'accepted', accepted_at = NOW(), accepted_user_id = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [invite.id, input.userId],
    );

    const accepted = await this.findByToken(input.token);
    return accepted ?? invite;
  }

  private async findByToken(token: string): Promise<PlatformAdminInvite | null> {
    if (!TOKEN_RE.test(token)) return null;
    const result = await this.db.query(
      `SELECT * FROM platform_admin_invites WHERE token = $1 LIMIT 1`,
      [token],
    );
    const row = result.rows[0];
    return row ? mapPlatformAdminInvite(row) : null;
  }

  private async requirePendingInvite(inviteId: string): Promise<PlatformAdminInvite> {
    const result = await this.db.query(
      `SELECT * FROM platform_admin_invites WHERE id = $1 LIMIT 1`,
      [inviteId],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Invitation introuvable');
    const invite = mapPlatformAdminInvite(row);
    if (invite.status !== 'pending') {
      throw new Error('Seule une invitation en attente peut être modifiée');
    }
    return invite;
  }

  private async assertCanDemoteSuperAdmin(userId: string): Promise<void> {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE platform_role = 'super_admin' AND id <> $1`,
      [userId],
    );
    if (Number(result.rows[0]?.count ?? 0) < 1) {
      throw new Error('Impossible de retirer le dernier super administrateur');
    }
  }
}
