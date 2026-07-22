import {
  canSubmitParcelsAsBusiness,
  canTransitionBusiness,
  transitionBusiness,
  type BusinessStatus,
} from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapBusiness } from '../db/mappers.js';
import type { Business } from '../db/types.js';
import { assertAdmin, assertBusinessScope, type DataAccessContext } from '../context.js';

export type CreateBusinessInput = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type CreateBusinessRegistrationInput = CreateBusinessInput & {
  otpCode: string;
  otpExpiresAt: Date;
};

export class BusinessRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateBusinessInput): Promise<Business> {
    const result = await this.db.query(
      `INSERT INTO businesses (name, contact_email, contact_phone, status)
       VALUES ($1, $2, $3, 'onboarding')
       RETURNING *`,
      [input.name, input.contactEmail ?? null, input.contactPhone ?? null],
    );
    return mapBusiness(result.rows[0]!);
  }

  async createForRegistration(input: CreateBusinessRegistrationInput): Promise<Business> {
    const result = await this.db.query(
      `INSERT INTO businesses (
         name, contact_email, contact_phone, status,
         is_phone_verified, otp_code, otp_expires_at
       )
       VALUES ($1, $2, $3, 'onboarding', false, $4, $5)
       RETURNING *`,
      [
        input.name,
        input.contactEmail ?? null,
        input.contactPhone ?? null,
        input.otpCode,
        input.otpExpiresAt,
      ],
    );
    return mapBusiness(result.rows[0]!);
  }

  async findByIdUnscoped(id: string): Promise<Business | null> {
    const result = await this.db.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? mapBusiness(row) : null;
  }

  async markPhoneVerified(id: string): Promise<Business> {
    const result = await this.db.query(
      `UPDATE businesses
       SET is_phone_verified = true, otp_code = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Business ${id} not found`);
    return mapBusiness(row);
  }

  async findById(ctx: DataAccessContext, id: string): Promise<Business | null> {
    assertBusinessScope(ctx, id);
    const result = await this.db.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? mapBusiness(row) : null;
  }

  async list(ctx: DataAccessContext): Promise<Business[]> {
    if (ctx.role === 'admin') {
      const result = await this.db.query(
        `SELECT * FROM businesses ORDER BY created_at DESC`,
      );
      return result.rows.map(mapBusiness);
    }
    if (ctx.role === 'business' && ctx.businessId) {
      const result = await this.db.query(
        `SELECT * FROM businesses WHERE id = $1`,
        [ctx.businessId],
      );
      return result.rows.map(mapBusiness);
    }
    return [];
  }

  async updateStatus(
    ctx: DataAccessContext,
    id: string,
    nextStatus: BusinessStatus,
  ): Promise<Business> {
    assertAdmin(ctx);
    const existing = await this.db.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [id]);
    const row = existing.rows[0];
    if (!row) throw new Error(`Business ${id} not found`);
    const business = mapBusiness(row);
    const status = transitionBusiness(business.status, nextStatus);
    const result = await this.db.query(
      `UPDATE businesses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return mapBusiness(result.rows[0]!);
  }

  async assertCanSubmitParcels(businessId: string): Promise<void> {
    const result = await this.db.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [
      businessId,
    ]);
    const row = result.rows[0];
    if (!row) throw new Error(`Business ${businessId} not found`);
    const business = mapBusiness(row);
    if (!canSubmitParcelsAsBusiness(business.status)) {
      throw new Error(`Business ${businessId} cannot submit parcels (status: ${business.status})`);
    }
  }

  canTransition(from: BusinessStatus, to: BusinessStatus): boolean {
    return canTransitionBusiness(from, to);
  }
}
