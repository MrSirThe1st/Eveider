import type { UpdateOrganizationOperatingAccessInput } from '@eveider/api-contracts';
import { generateBusinessAccessCode } from '@eveider/domain';
import {
  canSubmitParcelsAsBusiness,
  canTransitionBusiness,
  isKycOperationalLeftover,
  transitionBusiness,
  type BusinessStatus,
} from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapBusiness, mapBusinessLimit, mapBusinessPermission } from '../db/mappers.js';
import type { Business } from '../db/types.js';
import { assertAdmin, assertBusinessScope, type DataAccessContext } from '../context.js';
import { PLATFORM_DEFAULT_FEATURES } from './platform-settings.repository.js';

export type OrganizationOperatingAccess = {
  enabledFeatures: Array<(typeof PLATFORM_DEFAULT_FEATURES)[number]>;
  dailyShipments: number;
  monthlyShipments: number;
  maxPackageValueUsd: number;
  codDailyLimitUsd: number;
};

export type CreateBusinessInput = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
};

export type CreateBusinessRegistrationInput = CreateBusinessInput;

export class BusinessRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateBusinessInput): Promise<Business> {
    const accessCode = await this.allocateAccessCode();
    const platform = await this.loadPlatformDefaults();
    const initialStatus = 'active';

    const result = await this.db.query(
      `INSERT INTO businesses (name, contact_email, contact_phone, industry, status, access_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.name,
        input.contactEmail ?? null,
        input.contactPhone ?? null,
        input.industry ?? null,
        initialStatus,
        accessCode,
      ],
    );
    const business = mapBusiness(result.rows[0]!);
    await this.enableDefaultOperatingAccess(business.id, platform);
    return business;
  }

  async createForRegistration(input: CreateBusinessRegistrationInput): Promise<Business> {
    return this.create(input);
  }

  async enableDefaultOperatingAccess(
    businessId: string,
    platform?: Awaited<ReturnType<BusinessRepository['loadPlatformDefaults']>>,
  ): Promise<void> {
    const resolvedPlatform = platform ?? (await this.loadPlatformDefaults());
    for (const feature of resolvedPlatform.defaultEnabledFeatures) {
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
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (business_id) DO NOTHING`,
      [
        businessId,
        resolvedPlatform.defaultDailyShipments,
        resolvedPlatform.defaultMonthlyShipments,
        resolvedPlatform.defaultMaxPackageValueUsd,
        resolvedPlatform.defaultCodDailyLimitUsd,
      ],
    );
  }

  private async loadPlatformDefaults() {
    const result = await this.db.query(
      `SELECT * FROM platform_settings ORDER BY updated_at DESC LIMIT 1`,
    );
    const row = result.rows[0];
    if (!row) {
      return {
        requireOrgApproval: false,
        defaultDailyShipments: 50,
        defaultMonthlyShipments: 1000,
        defaultMaxPackageValueUsd: 500,
        defaultCodDailyLimitUsd: 200,
        defaultEnabledFeatures: [
          'CREATE_SHIPMENT',
          'API_ACCESS',
          'COD',
          'MONTHLY_INVOICE',
        ] as const,
      };
    }

    const featuresRaw =
      typeof row.default_enabled_features === 'string'
        ? JSON.parse(row.default_enabled_features)
        : row.default_enabled_features;
    const allowed = new Set([
      'CREATE_SHIPMENT',
      'API_ACCESS',
      'COD',
      'MONTHLY_INVOICE',
    ]);
    const defaultEnabledFeatures = Array.isArray(featuresRaw)
      ? featuresRaw.filter((item): item is string => typeof item === 'string' && allowed.has(item))
      : [];
    if (defaultEnabledFeatures.length === 0) {
      defaultEnabledFeatures.push(
        'CREATE_SHIPMENT',
        'API_ACCESS',
        'COD',
        'MONTHLY_INVOICE',
      );
    }

    return {
      requireOrgApproval: Boolean(row.require_org_approval),
      defaultDailyShipments: Number(row.default_daily_shipments),
      defaultMonthlyShipments: Number(row.default_monthly_shipments),
      defaultMaxPackageValueUsd: Number(row.default_max_package_value_usd),
      defaultCodDailyLimitUsd: Number(row.default_cod_daily_limit_usd),
      defaultEnabledFeatures,
    };
  }

  async findByIdUnscoped(id: string): Promise<Business | null> {
    const result = await this.db.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? mapBusiness(row) : null;
  }

  async findPlatformOrganization(): Promise<Business | null> {
    const result = await this.db.query(
      `SELECT * FROM businesses WHERE is_platform_org = true LIMIT 1`,
    );
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
    let currentStatus = business.status;
    if (isKycOperationalLeftover(currentStatus)) {
      await this.db.query(`UPDATE businesses SET status = 'active', updated_at = NOW() WHERE id = $1`, [
        id,
      ]);
      currentStatus = 'active';
    }
    const status = transitionBusiness(currentStatus, nextStatus);
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

  async getOperatingAccess(
    ctx: DataAccessContext,
    businessId: string,
  ): Promise<OrganizationOperatingAccess> {
    assertAdmin(ctx);
    await this.assertOrganizationTarget(businessId);

    const [permissionsResult, limitResult] = await Promise.all([
      this.db.query(
        `SELECT * FROM business_permissions WHERE business_id = $1 ORDER BY feature ASC`,
        [businessId],
      ),
      this.db.query(`SELECT * FROM business_limits WHERE business_id = $1 LIMIT 1`, [businessId]),
    ]);

    const enabled = new Set(
      permissionsResult.rows
        .map((row) => mapBusinessPermission(row))
        .filter((permission) => permission.status === 'ENABLED')
        .map((permission) => permission.feature),
    );
    const enabledFeatures = PLATFORM_DEFAULT_FEATURES.filter((feature) => enabled.has(feature));
    const platform = await this.loadPlatformDefaults();
    const limit = limitResult.rows[0] ? mapBusinessLimit(limitResult.rows[0]) : null;

    const resolvedFeatures =
      enabledFeatures.length > 0 ? enabledFeatures : PLATFORM_DEFAULT_FEATURES.filter((feature) =>
        platform.defaultEnabledFeatures.includes(feature),
      );

    return {
      enabledFeatures: [...resolvedFeatures],
      dailyShipments: limit?.dailyShipments ?? platform.defaultDailyShipments,
      monthlyShipments: limit?.monthlyShipments ?? platform.defaultMonthlyShipments,
      maxPackageValueUsd: limit?.maxPackageValueUsd ?? platform.defaultMaxPackageValueUsd,
      codDailyLimitUsd: limit?.codDailyLimitUsd ?? platform.defaultCodDailyLimitUsd,
    };
  }

  async updateOperatingAccess(
    ctx: DataAccessContext,
    businessId: string,
    input: UpdateOrganizationOperatingAccessInput,
  ): Promise<OrganizationOperatingAccess> {
    assertAdmin(ctx);
    await this.assertOrganizationTarget(businessId);
    await this.syncOperatingAccess(businessId, input.enabledFeatures, {
      dailyShipments: input.dailyShipments,
      monthlyShipments: input.monthlyShipments,
      maxPackageValueUsd: input.maxPackageValueUsd,
      codDailyLimitUsd: input.codDailyLimitUsd,
    });
    return this.getOperatingAccess(ctx, businessId);
  }

  async applyPlatformOperatingDefaults(
    ctx: DataAccessContext,
    businessId: string,
  ): Promise<OrganizationOperatingAccess> {
    assertAdmin(ctx);
    await this.assertOrganizationTarget(businessId);
    const platform = await this.loadPlatformDefaults();
    await this.syncOperatingAccess(
      businessId,
      PLATFORM_DEFAULT_FEATURES.filter((feature) =>
        platform.defaultEnabledFeatures.includes(feature),
      ),
      {
      dailyShipments: platform.defaultDailyShipments,
      monthlyShipments: platform.defaultMonthlyShipments,
      maxPackageValueUsd: platform.defaultMaxPackageValueUsd,
      codDailyLimitUsd: platform.defaultCodDailyLimitUsd,
    });
    return this.getOperatingAccess(ctx, businessId);
  }

  private async assertOrganizationTarget(businessId: string): Promise<Business> {
    const result = await this.db.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [businessId]);
    const row = result.rows[0];
    if (!row) throw new Error(`Business ${businessId} not found`);
    const business = mapBusiness(row);
    if (business.isPlatformOrg) {
      throw new Error('Les réglages plateforme ne s’appliquent pas à l’organisation Eveider');
    }
    return business;
  }

  private async syncOperatingAccess(
    businessId: string,
    enabledFeatures: readonly string[],
    limits: {
      dailyShipments: number;
      monthlyShipments: number;
      maxPackageValueUsd: number;
      codDailyLimitUsd: number;
    },
  ): Promise<void> {
    const enabled = new Set(enabledFeatures);
    for (const feature of PLATFORM_DEFAULT_FEATURES) {
      const status = enabled.has(feature) ? 'ENABLED' : 'DISABLED';
      await this.db.query(
        `INSERT INTO business_permissions (business_id, feature, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (business_id, feature) DO UPDATE
         SET status = EXCLUDED.status, updated_at = NOW()`,
        [businessId, feature, status],
      );
    }
    await this.db.query(
      `INSERT INTO business_limits
         (business_id, daily_shipments, monthly_shipments, max_package_value_usd, cod_daily_limit_usd)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (business_id) DO UPDATE
       SET daily_shipments = EXCLUDED.daily_shipments,
           monthly_shipments = EXCLUDED.monthly_shipments,
           max_package_value_usd = EXCLUDED.max_package_value_usd,
           cod_daily_limit_usd = EXCLUDED.cod_daily_limit_usd,
           updated_at = NOW()`,
      [
        businessId,
        limits.dailyShipments,
        limits.monthlyShipments,
        limits.maxPackageValueUsd,
        limits.codDailyLimitUsd,
      ],
    );
  }
}
