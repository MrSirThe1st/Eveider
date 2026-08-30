import type {
  AdminReviewDecisionInput,
  BusinessInfoStepInput,
  LegalVerificationStepInput,
  OperationsSetupStepInput,
  PaymentSetupStepInput,
} from '@eveider/api-contracts';
import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import {
  mapBillingAccount,
  mapBusiness,
  mapBusinessDocument,
  mapBusinessLimit,
  mapBusinessLocation,
  mapBusinessPermission,
  mapBusinessStatusHistory,
  mapBusinessVerification,
  mapLocker,
  mapSettlementAccount,
  mapUser,
  mapVerificationCheck,
} from '../db/mappers.js';
import type { BillingAccount, Business, BusinessLocation, SettlementAccount, VerificationStatus } from '../db/types.js';
import { withTransaction } from '../db/pool.js';

export type BusinessSettingsSnapshot = {
  name: string;
  businessType: Business['businessType'];
  industry: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  legalCompanyName: string | null;
  rccmNumber: string | null;
  nifNumber: string | null;
  legalRepName: string | null;
  accessCode: string | null;
  locations: BusinessLocation[];
  verificationStatus: VerificationStatus | null;
  verificationNotes: string | null;
};

export type LatestVerificationSnapshot = {
  status: VerificationStatus;
  reviewNotes: string | null;
};

export type BusinessBillingSnapshot = {
  paymentRule: BillingAccount['paymentRule'] | null;
  billingType: BillingAccount['billingType'] | null;
  payoutMethod: SettlementAccount['payoutMethod'] | null;
  accountHolder: string | null;
  accountNumber: string | null;
  dailyShipments: number | null;
  codDailyLimitUsd: number | null;
};

type Row = Record<string, unknown>;

function requiredRow(rows: Row[], message: string): Row {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}

function asJsonRows(value: unknown): Row[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Row[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as Row[]) : [];
}

async function loadVerification(db: Queryable, verificationId: string) {
  const verificationResult = await db.query(
    `SELECT * FROM business_verifications WHERE id = $1 LIMIT 1`,
    [verificationId],
  );
  const verification = mapBusinessVerification(
    requiredRow(verificationResult.rows, `Verification ${verificationId} not found`),
  );
  const checksResult = await db.query(
    `SELECT * FROM verification_checks
     WHERE business_verification_id = $1
     ORDER BY created_at ASC`,
    [verificationId],
  );
  const checks = checksResult.rows.map(mapVerificationCheck);

  const reviewerResult = verification.reviewerId
    ? await db.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [verification.reviewerId])
    : null;
  return {
    ...verification,
    checks,
    reviewer: reviewerResult?.rows[0] ? mapUser(reviewerResult.rows[0]) : null,
  };
}

async function loadSummary(db: Queryable, businessId: string) {
  const businessResult = await db.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [businessId]);
  const businessRow = businessResult.rows[0];
  if (!businessRow) return null;

  const [
    usersResult,
    locationsResult,
    documentsResult,
    billingResult,
    settlementResult,
    permissionsResult,
    limitResult,
    historyResult,
    verificationResult,
  ] = await Promise.all([
    db.query(
      `SELECT u.*, m.role AS membership_role
       FROM organization_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.business_id = $1
       ORDER BY CASE WHEN m.role = 'account_owner' THEN 0 ELSE 1 END, m.created_at ASC`,
      [businessId],
    ),
    db.query(`SELECT * FROM business_locations WHERE business_id = $1 ORDER BY created_at ASC`, [businessId]),
    db.query(`SELECT * FROM business_documents WHERE business_id = $1 ORDER BY created_at ASC`, [businessId]),
    db.query(`SELECT * FROM billing_accounts WHERE business_id = $1 LIMIT 1`, [businessId]),
    db.query(`SELECT * FROM settlement_accounts WHERE business_id = $1 LIMIT 1`, [businessId]),
    db.query(`SELECT * FROM business_permissions WHERE business_id = $1 ORDER BY created_at ASC`, [businessId]),
    db.query(`SELECT * FROM business_limits WHERE business_id = $1 LIMIT 1`, [businessId]),
    db.query(
      `SELECT * FROM business_status_histories WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId],
    ),
    db.query(
      `SELECT id FROM business_verifications
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [businessId],
    ),
  ]);

  const lockerIds = locationsResult.rows
    .map((location: Row) => location.dropoff_locker_id)
    .filter((id: unknown): id is string => typeof id === 'string');
  const lockersResult =
    lockerIds.length > 0
      ? await db.query(`SELECT * FROM lockers WHERE id = ANY($1::uuid[])`, [lockerIds])
      : { rows: [] as Row[] };
  const lockersById = new Map(
    lockersResult.rows.map((locker: Row) => [String(locker.id), mapLocker(locker)]),
  );
  const verification = verificationResult.rows[0]
    ? await loadVerification(db, String(verificationResult.rows[0].id))
    : null;

  return {
    ...mapBusiness(businessRow),
    users: usersResult.rows.map((row: Row) => ({
      ...mapUser(row),
      userRole: row.membership_role == null ? null : String(row.membership_role),
    })),
    locations: locationsResult.rows.map((location: Row) => {
      const mapped = mapBusinessLocation(location);
      return {
        ...mapped,
        dropoffLocker: mapped.dropoffLockerId ? lockersById.get(mapped.dropoffLockerId) ?? null : null,
      };
    }),
    documents: documentsResult.rows.map(mapBusinessDocument),
    billingAccount: billingResult.rows[0] ? mapBillingAccount(billingResult.rows[0]) : null,
    settlementAccount: settlementResult.rows[0] ? mapSettlementAccount(settlementResult.rows[0]) : null,
    verifications: verification ? [verification] : [],
    permissions: permissionsResult.rows.map(mapBusinessPermission),
    limit: limitResult.rows[0] ? mapBusinessLimit(limitResult.rows[0]) : null,
    statusHistory: historyResult.rows.map(mapBusinessStatusHistory),
  };
}

export class BusinessOnboardingRepository {
  constructor(private readonly db: Queryable) {}

  async saveBusinessInfo(businessId: string, input: BusinessInfoStepInput) {
    return withTransaction(async (tx) => {
      const businessResult = await tx.query(
        `UPDATE businesses
         SET name = $1, business_type = $2, industry = $3, sales_channels = $4,
             description = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [input.name, input.businessType, input.industry, input.salesChannels, input.description, businessId],
      );

      const existing = await tx.query(
        `SELECT id FROM business_locations
         WHERE business_id = $1 AND type = 'business_address'
         LIMIT 1
         FOR UPDATE`,
        [businessId],
      );
      if (existing.rows[0]) {
        await tx.query(
          `UPDATE business_locations
           SET country = $1, city = $2, street = $3, lat = $4, lng = $5, updated_at = NOW()
           WHERE id = $6`,
          [input.country, input.city, input.address, input.lat, input.lng, existing.rows[0].id],
        );
      } else {
        await tx.query(
          `INSERT INTO business_locations (business_id, type, country, city, street, lat, lng)
           VALUES ($1, 'business_address', $2, $3, $4, $5, $6)`,
          [businessId, input.country, input.city, input.address, input.lat, input.lng],
        );
      }
      return mapBusiness(requiredRow(businessResult.rows, `Business ${businessId} not found`));
    });
  }

  async updateAccountSettings(
    businessId: string,
    input: {
      name: string;
      businessType?: BusinessInfoStepInput['businessType'];
      industry?: string;
      description?: string;
      contactEmail: string;
      contactPhone: string;
      country: string;
      city: string;
      address: string;
      legalCompanyName?: string;
      rccmNumber?: string;
      nifNumber?: string;
      legalRepName?: string;
      pickupMethod: OperationsSetupStepInput['pickupMethod'];
      pickupAddress?: string;
      contactPerson?: string;
      pickupContactPhone?: string;
      availableDays?: string;
      availableHours?: string;
      dropoffLockerId?: string;
    },
  ) {
    return withTransaction(async (tx) => {
      const businessResult = await tx.query(
        `UPDATE businesses
         SET name = $1,
             business_type = COALESCE($2, business_type),
             industry = COALESCE($3, industry),
             description = $4,
             contact_email = $5,
             contact_phone = $6,
             legal_company_name = $7,
             rccm_number = $8,
             nif_number = $9,
             legal_rep_name = $10,
             updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          input.name,
          input.businessType ?? null,
          input.industry ?? null,
          input.description ?? null,
          input.contactEmail,
          input.contactPhone,
          input.legalCompanyName || null,
          input.rccmNumber || null,
          input.nifNumber || null,
          input.legalRepName || null,
          businessId,
        ],
      );

      const addressExisting = await tx.query(
        `SELECT id FROM business_locations
         WHERE business_id = $1 AND type = 'business_address'
         LIMIT 1
         FOR UPDATE`,
        [businessId],
      );
      if (addressExisting.rows[0]) {
        await tx.query(
          `UPDATE business_locations
           SET country = $1, city = $2, street = $3, updated_at = NOW()
           WHERE id = $4`,
          [input.country, input.city, input.address, addressExisting.rows[0].id],
        );
      } else {
        await tx.query(
          `INSERT INTO business_locations (business_id, type, country, city, street)
           VALUES ($1, 'business_address', $2, $3, $4)`,
          [businessId, input.country, input.city, input.address],
        );
      }

      const pickupExisting = await tx.query(
        `SELECT id FROM business_locations
         WHERE business_id = $1 AND type = 'pickup_point'
         LIMIT 1
         FOR UPDATE`,
        [businessId],
      );
      const pickupValues = [
        input.pickupMethod,
        input.pickupAddress ?? input.address,
        input.contactPerson ?? null,
        input.pickupContactPhone ?? null,
        input.availableDays ?? null,
        input.availableHours ?? null,
        input.dropoffLockerId ?? null,
      ];
      if (pickupExisting.rows[0]) {
        await tx.query(
          `UPDATE business_locations
           SET pickup_method = $1, street = $2, contact_person = $3, contact_phone = $4,
               available_days = $5, available_hours = $6, dropoff_locker_id = $7, updated_at = NOW()
           WHERE id = $8`,
          [...pickupValues, pickupExisting.rows[0].id],
        );
      } else {
        await tx.query(
          `INSERT INTO business_locations
             (business_id, type, pickup_method, street, contact_person, contact_phone,
              available_days, available_hours, dropoff_locker_id)
           VALUES ($1, 'pickup_point', $2, $3, $4, $5, $6, $7, $8)`,
          [businessId, ...pickupValues],
        );
      }

      return mapBusiness(requiredRow(businessResult.rows, `Business ${businessId} not found`));
    });
  }

  async saveLegalVerification(businessId: string, input: LegalVerificationStepInput) {
    return withTransaction(async (tx) => {
      const registered = input.isRegistered;
      const businessResult = await tx.query(
        `UPDATE businesses
         SET risk_classification = $1, legal_company_name = $2, rccm_number = $3,
             nif_number = $4, date_created = $5, legal_rep_name = $6,
             individual_full_name = $7, id_passport_number = $8, residential_address = $9,
             updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [
          registered ? 'registered_business' : 'individual_seller',
          registered ? input.legalCompanyName : null,
          registered ? input.rccmNumber : null,
          registered ? input.nifNumber : null,
          registered && input.dateCreated ? new Date(input.dateCreated) : null,
          registered ? input.legalRepName : null,
          registered ? null : input.individualFullName,
          registered ? null : input.idPassportNumber,
          registered ? null : input.residentialAddress,
          businessId,
        ],
      );

      for (const document of input.documents ?? []) {
        const existing = await tx.query(
          `SELECT id FROM business_documents
           WHERE business_id = $1 AND type = $2
           LIMIT 1
           FOR UPDATE`,
          [businessId, document.type],
        );
        if (existing.rows[0]) {
          await tx.query(
            `UPDATE business_documents
             SET file_url = $1, file_name = $2, status = 'pending', updated_at = NOW()
             WHERE id = $3`,
            [document.fileUrl, document.fileName, existing.rows[0].id],
          );
        } else {
          await tx.query(
            `INSERT INTO business_documents (business_id, type, file_url, file_name, status)
             VALUES ($1, $2, $3, $4, 'pending')`,
            [businessId, document.type, document.fileUrl, document.fileName],
          );
        }
      }
      return mapBusiness(requiredRow(businessResult.rows, `Business ${businessId} not found`));
    });
  }

  async saveOperationsSetup(businessId: string, input: OperationsSetupStepInput) {
    return withTransaction(async (tx) => {
      const existing = await tx.query(
        `SELECT id FROM business_locations
         WHERE business_id = $1 AND type = 'pickup_point'
         LIMIT 1
         FOR UPDATE`,
        [businessId],
      );
      const values = [
        input.pickupMethod,
        input.pickupAddress ?? 'Eveider Locker Location',
        input.contactPerson,
        input.contactPhone,
        input.availableDays,
        input.availableHours,
        input.dropoffLockerId,
      ];
      if (existing.rows[0]) {
        await tx.query(
          `UPDATE business_locations
           SET pickup_method = $1, street = $2, contact_person = $3, contact_phone = $4,
               available_days = $5, available_hours = $6, dropoff_locker_id = $7, updated_at = NOW()
           WHERE id = $8`,
          [...values, existing.rows[0].id],
        );
      } else {
        await tx.query(
          `INSERT INTO business_locations
             (business_id, type, pickup_method, street, contact_person, contact_phone,
              available_days, available_hours, dropoff_locker_id)
           VALUES ($1, 'pickup_point', $2, $3, $4, $5, $6, $7, $8)`,
          [businessId, ...values],
        );
      }
      const businessResult = await tx.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [businessId]);
      return mapBusiness(requiredRow(businessResult.rows, `Business ${businessId} not found`));
    });
  }

  async savePaymentSetup(businessId: string, input: PaymentSetupStepInput) {
    return withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO billing_accounts (business_id, payment_rule, billing_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (business_id) DO UPDATE
         SET payment_rule = EXCLUDED.payment_rule, billing_type = EXCLUDED.billing_type, updated_at = NOW()`,
        [businessId, input.paymentRule, input.billingType],
      );
      await tx.query(
        `INSERT INTO settlement_accounts (business_id, payout_method, account_holder, account_number)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (business_id) DO UPDATE
         SET payout_method = EXCLUDED.payout_method, account_holder = EXCLUDED.account_holder,
             account_number = EXCLUDED.account_number, updated_at = NOW()`,
        [businessId, input.payoutMethod, input.accountHolder, input.accountNumber],
      );
      const businessResult = await tx.query(`SELECT * FROM businesses WHERE id = $1 LIMIT 1`, [businessId]);
      return mapBusiness(requiredRow(businessResult.rows, `Business ${businessId} not found`));
    });
  }

  async submitApplication(businessId: string) {
    return withTransaction(async (tx) => {
      const businessResult = await tx.query(
        `SELECT * FROM businesses WHERE id = $1 LIMIT 1 FOR UPDATE`,
        [businessId],
      );
      const business = mapBusiness(requiredRow(businessResult.rows, `Business ${businessId} not found`));
      if (business.status === 'blocked' || business.status === 'suspended') {
        throw new Error(`Impossible de soumettre le dossier (compte ${business.status})`);
      }

      const latestResult = await tx.query(
        `SELECT * FROM business_verifications
         WHERE business_id = $1
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [businessId],
      );
      const latest = latestResult.rows[0] ? mapBusinessVerification(latestResult.rows[0]) : null;
      if (latest?.status === 'pending') {
        throw new Error('Un dossier de vérification est déjà en cours de revue');
      }
      if (latest?.status === 'approved') {
        throw new Error('Cette organisation est déjà vérifiée');
      }

      const verificationResult = await tx.query(
        `INSERT INTO business_verifications (business_id, status, submitted_at)
         VALUES ($1, 'pending', NOW())
         RETURNING *`,
        [businessId],
      );
      const verification = mapBusinessVerification(requiredRow(verificationResult.rows, 'Verification not created'));
      const checks = [
        ['PHONE_VERIFIED', business.isPhoneVerified ? 'PASS' : 'PENDING'],
        ['IDENTITY_MATCHED', 'PENDING'],
        ['DOCUMENT_VALID', 'PENDING'],
        ['ADDRESS_CONFIRMED', 'PENDING'],
        ['COMPANY_REGISTERED', 'PENDING'],
      ];
      for (const [type, status] of checks) {
        await tx.query(
          `INSERT INTO verification_checks (business_verification_id, type, status)
           VALUES ($1, $2, $3)`,
          [verification.id, type, status],
        );
      }
      const checkResult = await tx.query(
        `SELECT * FROM verification_checks WHERE business_verification_id = $1 ORDER BY created_at ASC`,
        [verification.id],
      );
      return {
        business,
        verification: { ...verification, checks: checkResult.rows.map(mapVerificationCheck) },
      };
    });
  }

  async getOnboardingSummary(businessId: string) {
    return loadSummary(this.db, businessId);
  }

  /** Account + locations only — used by Paramètres, not the full onboarding graph. */
  async getSettingsSnapshot(businessId: string): Promise<BusinessSettingsSnapshot | null> {
    const result = await this.db.query(
      `SELECT b.name,
              b.business_type,
              b.industry,
              b.description,
              b.contact_email,
              b.contact_phone,
              b.legal_company_name,
              b.rccm_number,
              b.nif_number,
              b.legal_rep_name,
              b.access_code,
              (
                SELECT v.status
                FROM business_verifications v
                WHERE v.business_id = b.id
                ORDER BY v.created_at DESC
                LIMIT 1
              ) AS verification_status,
              (
                SELECT v.review_notes
                FROM business_verifications v
                WHERE v.business_id = b.id
                ORDER BY v.created_at DESC
                LIMIT 1
              ) AS verification_notes,
              COALESCE((
                SELECT json_agg(loc.* ORDER BY loc.created_at ASC)
                FROM business_locations loc
                WHERE loc.business_id = b.id
              ), '[]'::json) AS locations_json
       FROM businesses b
       WHERE b.id = $1
       LIMIT 1`,
      [businessId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      name: String(row.name),
      businessType: (row.business_type as Business['businessType']) ?? null,
      industry: row.industry == null ? null : String(row.industry),
      description: row.description == null ? null : String(row.description),
      contactEmail: row.contact_email == null ? null : String(row.contact_email),
      contactPhone: row.contact_phone == null ? null : String(row.contact_phone),
      legalCompanyName: row.legal_company_name == null ? null : String(row.legal_company_name),
      rccmNumber: row.rccm_number == null ? null : String(row.rccm_number),
      nifNumber: row.nif_number == null ? null : String(row.nif_number),
      legalRepName: row.legal_rep_name == null ? null : String(row.legal_rep_name),
      accessCode: row.access_code == null || row.access_code === '' ? null : String(row.access_code),
      verificationStatus: (row.verification_status as VerificationStatus | null) ?? null,
      verificationNotes: row.verification_notes == null ? null : String(row.verification_notes),
      locations: asJsonRows(row.locations_json).map(mapBusinessLocation),
    };
  }

  /** Billing, settlement, and limits in one round trip — used by Facturation. */
  async getBillingSnapshot(businessId: string): Promise<BusinessBillingSnapshot | null> {
    const result = await this.db.query(
      `SELECT ba.payment_rule,
              ba.billing_type,
              sa.payout_method,
              sa.account_holder,
              sa.account_number,
              lim.daily_shipments,
              lim.cod_daily_limit_usd
       FROM businesses b
       LEFT JOIN billing_accounts ba ON ba.business_id = b.id
       LEFT JOIN settlement_accounts sa ON sa.business_id = b.id
       LEFT JOIN business_limits lim ON lim.business_id = b.id
       WHERE b.id = $1
       LIMIT 1`,
      [businessId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      paymentRule: (row.payment_rule as BillingAccount['paymentRule'] | null) ?? null,
      billingType: (row.billing_type as BillingAccount['billingType'] | null) ?? null,
      payoutMethod: (row.payout_method as SettlementAccount['payoutMethod'] | null) ?? null,
      accountHolder: row.account_holder == null ? null : String(row.account_holder),
      accountNumber: row.account_number == null ? null : String(row.account_number),
      dailyShipments: row.daily_shipments == null ? null : Number(row.daily_shipments),
      codDailyLimitUsd: row.cod_daily_limit_usd == null ? null : Number(row.cod_daily_limit_usd),
    };
  }

  async getLatestVerification(businessId: string): Promise<LatestVerificationSnapshot | null> {
    const result = await this.db.query(
      `SELECT status, review_notes
       FROM business_verifications
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [businessId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      status: row.status as VerificationStatus,
      reviewNotes: row.review_notes == null ? null : String(row.review_notes),
    };
  }

  async listOrganizationsForAdmin(
    ctx: DataAccessContext,
    options?: {
      search?: string;
      accountStatus?: 'active' | 'suspended' | 'all';
      verificationStatus?: string | 'all';
    },
  ) {
    assertAdmin(ctx);
    const params: unknown[] = [];
    const conditions: string[] = ['b.is_platform_org = FALSE'];

    if (options?.accountStatus === 'active') {
      conditions.push(`b.status IN ('active', 'draft', 'onboarding', 'pending_review', 'pending_correction', 'pending')`);
    } else if (options?.accountStatus === 'suspended') {
      conditions.push(`b.status IN ('suspended', 'blocked')`);
    }

    if (options?.verificationStatus && options.verificationStatus !== 'all') {
      if (options.verificationStatus === 'not_started') {
        conditions.push('latest.verification_status IS NULL');
      } else {
        params.push(options.verificationStatus);
        conditions.push(`latest.verification_status = $${params.length}::"VerificationStatus"`);
      }
    }

    if (options?.search?.trim()) {
      params.push(`%${options.search.trim()}%`);
      conditions.push(
        `(b.name ILIKE $${params.length}
          OR COALESCE(b.contact_email, '') ILIKE $${params.length}
          OR COALESCE(owner.full_name, '') ILIKE $${params.length}
          OR COALESCE(owner.email, '') ILIKE $${params.length})`,
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query(
      `SELECT b.*,
              COALESCE(latest.verification_status::text, 'not_started') AS verification_status,
              owner.full_name AS owner_name,
              owner.email AS owner_email
       FROM businesses b
       LEFT JOIN LATERAL (
         SELECT v.status AS verification_status
         FROM business_verifications v
         WHERE v.business_id = b.id
         ORDER BY v.created_at DESC
         LIMIT 1
       ) latest ON TRUE
       LEFT JOIN LATERAL (
         SELECT u.full_name, u.email
         FROM organization_memberships m
         JOIN users u ON u.id = m.user_id
         WHERE m.business_id = b.id AND m.role = 'account_owner'
         ORDER BY m.created_at ASC
         LIMIT 1
       ) owner ON TRUE
       ${where}
       ORDER BY b.updated_at DESC`,
      params,
    );

    return result.rows.map((row: Row) => ({
      business: mapBusiness(row),
      verificationStatus: String(row.verification_status),
      ownerName: row.owner_name == null ? null : String(row.owner_name),
      ownerEmail: row.owner_email == null ? null : String(row.owner_email),
    }));
  }

  async listApplications(ctx: DataAccessContext, options?: { search?: string }) {
    assertAdmin(ctx);
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (options?.search?.trim()) {
      params.push(`%${options.search.trim()}%`);
      conditions.push(
        `(b.name ILIKE $${params.length} OR COALESCE(b.contact_email, '') ILIKE $${params.length} OR COALESCE(b.access_code, '') ILIKE $${params.length})`,
      );
    }
    const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    const businessesResult = await this.db.query(
      `SELECT b.*,
              latest.verification_status,
              latest.verification_notes,
              latest.verification_submitted_at,
              COALESCE((
                SELECT json_agg(
                  to_jsonb(u) || jsonb_build_object('membership_role', m.role)
                  ORDER BY CASE WHEN m.role = 'account_owner' THEN 0 ELSE 1 END, m.created_at ASC
                )
                FROM organization_memberships m
                JOIN users u ON u.id = m.user_id
                WHERE m.business_id = b.id
              ), '[]'::json) AS users_json,
              COALESCE((
                SELECT json_agg(loc.* ORDER BY loc.created_at ASC)
                FROM business_locations loc
                WHERE loc.business_id = b.id
              ), '[]'::json) AS locations_json
       FROM businesses b
       JOIN LATERAL (
         SELECT v.status AS verification_status,
                v.review_notes AS verification_notes,
                v.submitted_at AS verification_submitted_at
         FROM business_verifications v
         WHERE v.business_id = b.id
         ORDER BY v.created_at DESC
         LIMIT 1
       ) latest ON latest.verification_status IN ('pending', 'correction_requested')
       WHERE true ${where}
       ORDER BY b.updated_at DESC`,
      params,
    );
    if (businessesResult.rows.length === 0) return [];

    return businessesResult.rows.map((row: Row) => {
      const business = mapBusiness(row);
      const users = asJsonRows(row.users_json).map((userRow) => ({
        ...mapUser(userRow),
        userRole: userRow.membership_role == null ? null : String(userRow.membership_role),
      }));
      const locations = asJsonRows(row.locations_json).map(mapBusinessLocation);
      const verificationStatus = row.verification_status == null ? null : String(row.verification_status);
      return {
        ...business,
        users,
        locations,
        documents: [],
        billingAccount: null,
        settlementAccount: null,
        verifications: verificationStatus
          ? [
              {
                status: verificationStatus,
                reviewNotes: row.verification_notes == null ? null : String(row.verification_notes),
                submittedAt: row.verification_submitted_at ? new Date(String(row.verification_submitted_at)) : null,
                reviewedAt: null,
                checks: [],
              },
            ]
          : [],
        statusHistory: [],
      };
    });
  }

  async listApplicationIds(ctx: DataAccessContext, options?: { search?: string }): Promise<string[]> {
    assertAdmin(ctx);
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (options?.search?.trim()) {
      params.push(`%${options.search.trim()}%`);
      conditions.push(
        `(b.name ILIKE $${params.length} OR COALESCE(b.contact_email, '') ILIKE $${params.length} OR COALESCE(b.access_code, '') ILIKE $${params.length})`,
      );
    }
    const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    const result = await this.db.query(
      `SELECT b.id
       FROM businesses b
       JOIN LATERAL (
         SELECT v.status AS verification_status
         FROM business_verifications v
         WHERE v.business_id = b.id
         ORDER BY v.created_at DESC
         LIMIT 1
       ) latest ON latest.verification_status IN ('pending', 'correction_requested')
       WHERE true ${where}
       ORDER BY b.updated_at DESC`,
      params,
    );
    return result.rows.map((row) => String(row.id));
  }

  async processAdminDecision(ctx: DataAccessContext, businessId: string, input: AdminReviewDecisionInput) {
    assertAdmin(ctx);
    return withTransaction(async (tx) => {
      const businessResult = await tx.query(
        `SELECT * FROM businesses WHERE id = $1 LIMIT 1 FOR UPDATE`,
        [businessId],
      );
      const business = mapBusiness(requiredRow(businessResult.rows, `Business ${businessId} not found`));
      const verificationResult = await tx.query(
        `SELECT * FROM business_verifications
         WHERE business_id = $1
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [businessId],
      );
      const currentVerification = verificationResult.rows[0]
        ? mapBusinessVerification(verificationResult.rows[0])
        : null;

      if (input.action === 'approve') {
        if (!currentVerification || currentVerification.status === 'approved') {
          throw new Error('Aucun dossier de vérification à approuver');
        }
        await tx.query(
          `UPDATE business_verifications
           SET status = 'approved', reviewer_id = $1, review_notes = $2, reviewed_at = NOW(), updated_at = NOW()
           WHERE id = $3`,
          [ctx.userId ?? null, input.reviewNotes, currentVerification.id],
        );
        for (const check of input.checks ?? []) {
          await tx.query(
            `UPDATE verification_checks
             SET status = $1, notes = $2, updated_at = NOW()
             WHERE business_verification_id = $3 AND type = $4`,
            [check.status, check.notes ?? null, currentVerification.id, check.type],
          );
        }
        for (const feedback of input.documentsFeedback ?? []) {
          await tx.query(
            `UPDATE business_documents
             SET status = $1, notes = $2, updated_at = NOW()
             WHERE id = $3`,
            [feedback.status, feedback.notes ?? null, feedback.documentId],
          );
        }
        await tx.query(
          `INSERT INTO notifications (user_id, channel, message)
           VALUES ($1, 'sms', $2)`,
          [ctx.userId ?? null, `Votre organisation "${business.name}" est maintenant vérifiée.`],
        );
        return business;
      }

      if (input.action === 'request_correction') {
        if (!currentVerification) {
          throw new Error('Aucun dossier de vérification à corriger');
        }
        if (currentVerification) {
          await tx.query(
            `UPDATE business_verifications
             SET status = 'correction_requested', reviewer_id = $1, review_notes = $2,
                 reviewed_at = NOW(), updated_at = NOW()
             WHERE id = $3`,
            [ctx.userId ?? null, input.reviewNotes, currentVerification.id],
          );
        }
        for (const check of input.checks ?? []) {
          if (currentVerification) {
            await tx.query(
              `UPDATE verification_checks
               SET status = $1, notes = $2, updated_at = NOW()
               WHERE business_verification_id = $3 AND type = $4`,
              [check.status, check.notes ?? null, currentVerification.id, check.type],
            );
          }
        }
        for (const feedback of input.documentsFeedback ?? []) {
          const documentResult = await tx.query(
            `UPDATE business_documents
             SET status = $1, notes = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [feedback.status, feedback.notes ?? null, feedback.documentId],
          );
          requiredRow(documentResult.rows, `Business document ${feedback.documentId} not found`);
        }
        return business;
      }

      if (input.action === 'reject') {
        if (!currentVerification) {
          throw new Error('Aucun dossier de vérification à refuser');
        }
        await tx.query(
          `UPDATE business_verifications
           SET status = 'rejected', reviewer_id = $1, review_notes = $2,
               reviewed_at = NOW(), updated_at = NOW()
           WHERE id = $3`,
          [ctx.userId ?? null, input.reviewNotes, currentVerification.id],
        );
        for (const check of input.checks ?? []) {
          await tx.query(
            `UPDATE verification_checks
             SET status = $1, notes = $2, updated_at = NOW()
             WHERE business_verification_id = $3 AND type = $4`,
            [check.status, check.notes ?? null, currentVerification.id, check.type],
          );
        }
        for (const feedback of input.documentsFeedback ?? []) {
          await tx.query(
            `UPDATE business_documents
             SET status = $1, notes = $2, updated_at = NOW()
             WHERE id = $3`,
            [feedback.status, feedback.notes ?? null, feedback.documentId],
          );
        }
        return business;
      }

      throw new Error('Action de revue admin inconnue');
    });
  }
}
