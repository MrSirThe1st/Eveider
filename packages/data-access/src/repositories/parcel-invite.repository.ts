import { assertBusinessScope, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { withTransaction } from '../db/pool.js';
import { mapParcel, mapParcelInvite } from '../db/mappers.js';
import type { ParcelInvite } from '../db/types.js';
import {
  getInviteExpiryDate,
  recordInviteDelivery,
  sendInvitation,
} from '../invitations/invitation.service.js';
import { buildInviteLinks } from '../invitations/invite-links.js';

export type InvitePreview = {
  business: string;
  recipientPhone: string;
  recipientName: string | null;
  parcel: {
    id: string;
    reference: string;
    locker: string | null;
  };
};

export type InviteDeliveryInfo = {
  status: 'pending' | 'accepted' | 'expired';
  deepLink: string;
  webLink: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export class ParcelInviteRepository {
  constructor(private readonly db: Queryable) {}

  async createForParcel(
    parcelId: string,
    phone: string,
    email?: string | null,
  ): Promise<ParcelInvite> {
    const result = await this.db.query(
      `INSERT INTO parcel_invites (parcel_id, phone, email, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [parcelId, phone, email ?? null, getInviteExpiryDate()],
    );
    return mapParcelInvite(result.rows[0]!);
  }

  async findByToken(token: string) {
    // Postgres uuid columns reject non-uuid text with a 22P02 error — treat as missing.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      return null;
    }

    const result = await this.db.query(
      `SELECT i.*, row_to_json(p.*) AS parcel_row, b.name AS business_name, l.name AS locker_name
       FROM parcel_invites i JOIN parcels p ON p.id = i.parcel_id
       JOIN businesses b ON b.id = p.business_id LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE i.token = $1 LIMIT 1`,
      [token],
    );
    const row = result.rows[0];
    if (!row) return null;
    const parcelRow = row.parcel_row as Record<string, unknown>;
    return {
      ...mapParcelInvite(row),
      parcel: {
        ...mapParcel(parcelRow),
        business: { name: String(row.business_name) },
        locker: row.locker_name == null ? null : { name: String(row.locker_name) },
      },
    };
  }

  async getPreview(token: string): Promise<InvitePreview | null> {
    const invite = await this.findByToken(token);
    if (!invite) return null;

    if (invite.status === 'accepted') {
      throw new Error('Cette invitation a déjà été utilisée');
    }

    if (invite.status === 'expired' || invite.expiresAt < new Date()) {
      if (invite.status !== 'expired') {
        await this.db.query(`UPDATE parcel_invites SET status = 'expired' WHERE id = $1`, [invite.id]);
      }
      throw new Error('Cette invitation a expiré');
    }

    return {
      business: invite.parcel.business.name,
      recipientPhone: invite.phone,
      recipientName: invite.parcel.recipientName,
      parcel: {
        id: invite.parcel.id,
        reference: invite.parcel.reference,
        locker: invite.parcel.locker?.name ?? null,
      },
    };
  }

  async accept(token: string, userId: string, userPhone?: string | null): Promise<void> {
    const invite = await this.findByToken(token);
    if (!invite) {
      throw new Error('Invitation introuvable');
    }

    if (invite.status === 'accepted') {
      if (invite.parcel.customerId === userId) return;
      throw new Error('Cette invitation a déjà été utilisée');
    }

    if (invite.status === 'expired' || invite.expiresAt < new Date()) {
      throw new Error('Cette invitation a expiré');
    }

    if (userPhone && invite.phone !== userPhone) {
      throw new Error('Le numéro de téléphone ne correspond pas à l\'invitation');
    }

    await withTransaction(async (tx) => {
      await tx.query(`UPDATE parcels SET customer_id = $1, updated_at = NOW() WHERE id = $2`, [userId, invite.parcelId]);
      await tx.query(`UPDATE parcels SET customer_id = $1, updated_at = NOW() WHERE recipient_phone = $2 AND customer_id IS NULL`, [userId, invite.phone]);
      await tx.query(`UPDATE parcel_invites SET status = 'accepted', accepted_at = NOW() WHERE id = $1`, [invite.id]);
    });
  }

  async getForParcel(ctx: DataAccessContext, parcelId: string): Promise<InviteDeliveryInfo | null> {
    const parcel = await this.db.query(`SELECT business_id FROM parcels WHERE id = $1 LIMIT 1`, [parcelId]);
    if (!parcel.rows[0]) return null;
    assertBusinessScope(ctx, String(parcel.rows[0].business_id));

    const inviteResult = await this.db.query(`SELECT * FROM parcel_invites WHERE parcel_id = $1 LIMIT 1`, [parcelId]);
    if (!inviteResult.rows[0]) return null;
    const invite = mapParcelInvite(inviteResult.rows[0]);

    const links = buildInviteLinks(invite.token);
    return {
      status: invite.status,
      deepLink: links.deepLink,
      webLink: links.webLink,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    };
  }

  async resend(ctx: DataAccessContext, parcelId: string): Promise<InviteDeliveryInfo> {
    const parcelResult = await this.db.query(
      `SELECT p.*, b.name AS business_name FROM parcels p JOIN businesses b ON b.id = p.business_id WHERE p.id = $1 LIMIT 1`,
      [parcelId],
    );
    const parcel = parcelResult.rows[0];
    if (!parcel) {
      throw new Error('Colis introuvable');
    }
    assertBusinessScope(ctx, String(parcel.business_id));

    if (parcel.customer_id) {
      throw new Error('Le destinataire a déjà un compte Eveider');
    }

    const existingInvite = await this.db.query(`SELECT * FROM parcel_invites WHERE parcel_id = $1 LIMIT 1`, [parcelId]);
    let invite = existingInvite.rows[0] ? mapParcelInvite(existingInvite.rows[0]) : null;
    if (!invite) {
      invite = await this.createForParcel(parcelId, String(parcel.recipient_phone));
    } else if (invite.status === 'accepted') {
      throw new Error('L\'invitation a déjà été acceptée');
    } else if (invite.status === 'expired' || invite.expiresAt < new Date()) {
      const updated = await this.db.query(
        `UPDATE parcel_invites SET status = 'pending', expires_at = $1, accepted_at = NULL WHERE id = $2 RETURNING *`,
        [getInviteExpiryDate(), invite.id],
      );
      invite = mapParcelInvite(updated.rows[0]!);
    }

    const delivery = await sendInvitation({
      token: invite.token,
      phone: invite.phone,
      email: invite.email,
      businessName: String(parcel.business_name),
      parcelReference: String(parcel.reference),
    });

    await recordInviteDelivery(this.db, parcelId, delivery);

    const links = buildInviteLinks(invite.token);
    return {
      status: invite.status,
      deepLink: links.deepLink,
      webLink: links.webLink,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    };
  }

  async dispatchForNewParcel(
    parcelId: string,
    phone: string,
    email: string | null | undefined,
    businessName: string,
    parcelReference: string,
  ): Promise<InviteDeliveryInfo> {
    const invite = await this.createForParcel(parcelId, phone, email);

    const delivery = await sendInvitation({
      token: invite.token,
      phone,
      email,
      businessName,
      parcelReference,
    });

    await recordInviteDelivery(this.db, parcelId, delivery);

    const links = buildInviteLinks(invite.token);
    return {
      status: invite.status,
      deepLink: links.deepLink,
      webLink: links.webLink,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: null,
    };
  }
}
