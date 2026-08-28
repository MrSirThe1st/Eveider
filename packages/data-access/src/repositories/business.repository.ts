import { generateBusinessAccessCode } from '@eveider/domain';
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
  industry?: string;
};

export type CreateBusinessRegistrationInput = CreateBusinessInput;

const DEFAULT_FEATURES = ['CREATE_SHIPMENT', 'API_ACCESS', 'COD', 'MONTHLY_INVOICE'] as const;

export class BusinessRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateBusinessInput): Promise<Business> {
    const accessCode = await this.allocateAccessCode();
    const result = await this.db.query(
      `INSERT INTO businesses (name, contact_email, contact_phone, industry, status, access_code)
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING *`,
      [input.name, input.contactEmail ?? null, input.contactPhone ?? null, input.industry ?? null, accessCode],
    );
    const business = mapBusiness(result.rows[0]!);
    await this.enableDefaultOperatingAccess(business.id);
    return business;
  }

  async createForRegistration(input: CreateBusinessRegistrationInput): Promise<Business> {
    return this.create(input);
  }

  async enableDefaultOperatingAccess(businessId: string): Promise<void> {
    for (const feature of DEFAULT_FEATURES) {
      await this.db.query(
        `INSERT INTO business_permissions (business_id, feature, status)
         VALUES ($1, $2, 'ENABLED')
         ON CONFLICT (business_id, feature) DO UPDATE
         SET status = 'ENABLED', updated_at = NOW()`,
        [businessId, feature],
      );
    }
    await this.db.query(
      `INSERT INTO business_limits
         (business_id, daily_shipments, monthly_shipments, max_package_value_usd, cod_daily_limit_usd)
       VALUES ($1, 50, 1000, 500.0, 200.0)
       ON CONFLICT (business_id) DO NOTHING`,
      [businessId],
    );
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

  async list(
    ctx: DataAccessContext,
    options?: {
      statuses?: BusinessStatus[];
      excludeStatuses?: BusinessStatus[];
      search?: string;
    },
  ): Promise<Business[]> {
    if (ctx.role === 'admin') {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options?.statuses?.length) {
        params.push(options.statuses);
        conditions.push(`status = ANY($${params.length})`);
      }
      if (options?.excludeStatuses?.length) {
        params.push(options.excludeStatuses);
        conditions.push(`NOT (status = ANY($${params.length}))`);
      }
      if (options?.search?.trim()) {
        params.push(`%${options.search.trim()}%`);
        conditions.push(
          `(name ILIKE $${params.length} OR COALESCE(contact_email, '') ILIKE $${params.length} OR COALESCE(access_code, '') ILIKE $${params.length})`,
        );
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await this.db.query(
        `SELECT * FROM businesses ${where} ORDER BY created_at DESC`,
        params,
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

  async updateContacts(
    ctx: DataAccessContext,
    id: string,
    input: { contactEmail: string; contactPhone: string },
  ): Promise<Business> {
    assertBusinessScope(ctx, id);
    const result = await this.db.query(
      `UPDATE businesses
       SET contact_email = $1, contact_phone = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [input.contactEmail, input.contactPhone, id],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Business ${id} not found`);
    return mapBusiness(row);
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

  async allocateAccessCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const accessCode = generateBusinessAccessCode();
      const existing = await this.db.query(
        `SELECT id FROM businesses WHERE access_code = $1 LIMIT 1`,
        [accessCode],
      );
      if (!existing.rows[0]) return accessCode;
    }
    throw new Error('Impossible de générer un code d’accès entreprise unique');
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
