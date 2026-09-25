import type { Queryable } from '../db/index.js';
import { mapDriverInvite } from '../db/mappers.js';
import type { DriverInvite } from '../db/types.js';
import type { DataAccessContext } from '../context.js';
import { buildDriverInviteLink } from '../invitations/invite-links.js';
import { sendDriverInviteEmail } from '../messaging/driver-invite-email.js';
import { getResendConfig } from '../messaging/resend-config.js';

const TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const INVITE_EXPIRY_DAYS = 14;

export type DriverInviteDelivery = {
  invite: DriverInvite;
  inviteUrl: string;
  delivered: 'email' | 'simulated';
};

export type DriverInvitePreview = {
  email: string;
  fullName: string;
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

export class DriverInviteRepository {
  constructor(private readonly db: Queryable) {}

  async createForDossier(
    ctx: DataAccessContext,
    input: { dossierId: string; email: string; fullName: string },
  ): Promise<DriverInviteDelivery> {
    const email = normalizeEmail(input.email);

    await this.db.query(
      `UPDATE driver_invites
       SET status = 'revoked', updated_at = NOW()
       WHERE dossier_id = $1 AND status = 'pending'`,
      [input.dossierId],
    );

    const inserted = await this.db.query(
      `INSERT INTO driver_invites (dossier_id, email, invited_by_user_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.dossierId, email, ctx.userId ?? null, getExpiryDate()],
    );
    const invite = mapDriverInvite(inserted.rows[0]!);
    const inviteUrl = buildDriverInviteLink(invite.token);

    let delivered: DriverInviteDelivery['delivered'] = 'email';
    try {
      await sendDriverInviteEmail({
        to: invite.email,
        fullName: input.fullName,
        inviteUrl,
      });
    } catch (error) {
      if (!getResendConfig()) {
        console.info('[eveider:driver-invite:simulated]', {
          email: invite.email,
          inviteUrl,
          dossierId: input.dossierId,
        });
        delivered = 'simulated';
      } else {
        await this.db.query(
          `DELETE FROM driver_invites WHERE id = $1 AND status = 'pending'`,
          [invite.id],
        );
        throw error;
      }
    }

    return { invite, inviteUrl, delivered };
  }

  async getPreview(token: string): Promise<DriverInvitePreview | null> {
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
          `UPDATE driver_invites SET status = 'expired', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
          [invite.id],
        );
      }
      throw new Error('Cette invitation a expiré');
    }

    const dossier = await this.db.query(
      `SELECT full_name FROM driver_dossiers WHERE id = $1 LIMIT 1`,
      [invite.dossierId],
    );
    const fullName = dossier.rows[0]?.full_name;
    return {
      email: invite.email,
      fullName: fullName == null ? '' : String(fullName),
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptForUser(input: {
    token: string;
    email: string;
    userId: string;
  }): Promise<DriverInvite> {
    const preview = await this.getPreview(input.token);
    if (!preview) {
      throw new Error('Invitation introuvable');
    }
    if (normalizeEmail(input.email) !== normalizeEmail(preview.email)) {
      throw new Error('Cette invitation est destinée à une autre adresse email');
    }

    const invite = await this.findByToken(input.token);
    if (!invite) throw new Error('Invitation introuvable');

    await this.db.query(
      `UPDATE driver_invites
       SET status = 'accepted', accepted_at = NOW(), accepted_user_id = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [invite.id, input.userId],
    );

    return (await this.findByToken(input.token)) ?? invite;
  }

  async findPendingByDossierId(dossierId: string): Promise<DriverInvite | null> {
    const result = await this.db.query(
      `SELECT * FROM driver_invites
       WHERE dossier_id = $1 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [dossierId],
    );
    const row = result.rows[0];
    return row ? mapDriverInvite(row) : null;
  }

  private async findByToken(token: string): Promise<DriverInvite | null> {
    if (!TOKEN_RE.test(token)) return null;
    const result = await this.db.query(
      `SELECT * FROM driver_invites WHERE token = $1 LIMIT 1`,
      [token],
    );
    const row = result.rows[0];
    return row ? mapDriverInvite(row) : null;
  }
}
