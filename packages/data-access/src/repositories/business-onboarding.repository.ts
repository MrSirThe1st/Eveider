import type {
  AdminReviewDecisionInput,
  BusinessInfoStepInput,
  LegalVerificationStepInput,
  OperationsSetupStepInput,
  PaymentSetupStepInput,
} from '@eveider/api-contracts';
import { canTransitionBusiness, transitionBusiness, type BusinessStatus } from '@eveider/domain';
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
import { withTransaction } from '../db/pool.js';

type Row = Record<string, unknown>;

function requiredRow(rows: Row[], message: string): Row {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
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
    db.query(`SELECT * FROM users WHERE business_id = $1`, [businessId]),
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
    users: usersResult.rows.map(mapUser),
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
             description = $5, status = 'onboarding', updated_at = NOW()
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
      const nextStatus: BusinessStatus = 'pending_review';
      if (!canTransitionBusiness(business.status, nextStatus)) {
        throw new Error(`Impossible de soumettre l'application (Statut actuel: ${business.status})`);
      }

      const updatedResult = await tx.query(
        `UPDATE businesses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [nextStatus, businessId],
      );
      await tx.query(
        `INSERT INTO business_status_histories (business_id, previous_status, new_status, reason)
         VALUES ($1, $2, $3, $4)`,
        [
          businessId,
          business.status,
          nextStatus,
          "Soumission du dossier d'enregistrement entreprise pour vérification admin",
        ],
      );
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
        business: mapBusiness(requiredRow(updatedResult.rows, `Business ${businessId} not found`)),
        verification: { ...verification, checks: checkResult.rows.map(mapVerificationCheck) },
      };
    });
  }

  async getOnboardingSummary(businessId: string) {
    return loadSummary(this.db, businessId);
  }

  async listApplications(ctx: DataAccessContext) {
    assertAdmin(ctx);
    const result = await this.db.query(`SELECT id FROM businesses ORDER BY updated_at DESC`);
    return Promise.all(
      result.rows.map(async (row: Row) => {
        const summary = await loadSummary(this.db, String(row.id));
        if (!summary) throw new Error(`Business ${row.id} not found`);
        const { permissions: _permissions, limit: _limit, statusHistory: _statusHistory, ...application } =
          summary;
        return {
          ...application,
          locations: application.locations.map(
            ({ dropoffLocker: _dropoffLocker, ...location }) => location,
          ),
          verifications: application.verifications.map(({ reviewer: _reviewer, ...verification }) => verification),
        };
      }),
    );
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
        const nextStatus = transitionBusiness(business.status, 'active');
        const updatedResult = await tx.query(
          `UPDATE businesses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [nextStatus, businessId],
        );
        if (currentVerification) {
          await tx.query(
            `UPDATE business_verifications
             SET status = 'approved', reviewer_id = $1, review_notes = $2, reviewed_at = NOW(), updated_at = NOW()
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
              [check.status, check.notes, currentVerification.id, check.type],
            );
          }
        }
        for (const feature of ['CREATE_SHIPMENT', 'API_ACCESS', 'COD', 'MONTHLY_INVOICE']) {
          await tx.query(
            `INSERT INTO business_permissions (business_id, feature, status)
             VALUES ($1, $2, 'ENABLED')
             ON CONFLICT (business_id, feature) DO UPDATE
             SET status = 'ENABLED', updated_at = NOW()`,
            [businessId, feature],
          );
        }
        await tx.query(
          `INSERT INTO business_limits
             (business_id, daily_shipments, monthly_shipments, max_package_value_usd, cod_daily_limit_usd)
           VALUES ($1, 50, 1000, 500.0, 200.0)
           ON CONFLICT (business_id) DO NOTHING`,
          [businessId],
        );
        await tx.query(
          `INSERT INTO business_status_histories
             (business_id, previous_status, new_status, changed_by, reason)
           VALUES ($1, $2, 'active', $3, $4)`,
          [
            businessId,
            business.status,
            ctx.userId ?? 'ADMIN',
            input.reviewNotes ?? "Dossier approuvé par l'équipe de vérification Eveider.",
          ],
        );
        await tx.query(
          `INSERT INTO notifications (user_id, channel, message)
           VALUES ($1, 'sms', $2)`,
          [ctx.userId ?? null, `Bienvenue chez Eveider ! Votre compte professionnel "${business.name}" est maintenant actif.`],
        );
        return mapBusiness(requiredRow(updatedResult.rows, `Business ${businessId} not found`));
      }

      if (input.action === 'request_correction') {
        const nextStatus = transitionBusiness(business.status, 'pending_correction');
        const updatedResult = await tx.query(
          `UPDATE businesses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [nextStatus, businessId],
        );
        if (currentVerification) {
          await tx.query(
            `UPDATE business_verifications
             SET status = 'correction_requested', reviewer_id = $1, review_notes = $2,
                 reviewed_at = NOW(), updated_at = NOW()
             WHERE id = $3`,
            [ctx.userId ?? null, input.reviewNotes, currentVerification.id],
          );
        }
        for (const feedback of input.documentsFeedback ?? []) {
          const documentResult = await tx.query(
            `UPDATE business_documents
             SET status = $1, notes = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [feedback.status, feedback.notes, feedback.documentId],
          );
          requiredRow(documentResult.rows, `Business document ${feedback.documentId} not found`);
        }
        await tx.query(
          `INSERT INTO business_status_histories
             (business_id, previous_status, new_status, changed_by, reason)
           VALUES ($1, $2, 'pending_correction', $3, $4)`,
          [
            businessId,
            business.status,
            ctx.userId ?? 'ADMIN',
            input.reviewNotes ?? 'Corrections requises pour la validation du compte.',
          ],
        );
        return mapBusiness(requiredRow(updatedResult.rows, `Business ${businessId} not found`));
      }

      if (input.action === 'block') {
        const nextStatus = transitionBusiness(business.status, 'blocked');
        const updatedResult = await tx.query(
          `UPDATE businesses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [nextStatus, businessId],
        );
        await tx.query(
          `INSERT INTO business_status_histories
             (business_id, previous_status, new_status, changed_by, reason)
           VALUES ($1, $2, 'blocked', $3, $4)`,
          [
            businessId,
            business.status,
            ctx.userId ?? 'ADMIN',
            input.reviewNotes ?? 'Compte bloqué suite au contrôle de conformité.',
          ],
        );
        return mapBusiness(requiredRow(updatedResult.rows, `Business ${businessId} not found`));
      }

      throw new Error('Action de revue admin inconnue');
    });
  }
}
