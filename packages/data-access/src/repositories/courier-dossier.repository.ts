import {
  assertCourierDossierTransition,
  type CourierContractorKind,
  type CourierDossierStatus,
  type DriverDossierStatus,
} from '@eveider/domain';
import {
  AccessDeniedError,
  assertAdmin,
  assertBusinessRole,
  assertCompanyPermission,
  type DataAccessContext,
} from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapCourierDossier } from '../db/mappers.js';
import type { CourierDossier } from '../db/types.js';

export type CreateCourierDossierInput = {
  contractorType: CourierContractorKind;
  businessId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  idDocumentUrl: string;
  notes?: string | null;
};

export type ReviewCourierDossierInput = {
  status: Extract<CourierDossierStatus, 'approved' | 'needs_correction' | 'rejected'>;
  reviewNotes?: string | null;
};

const ACTIVE_DELIVERY_STATUSES = ['assigned', 'scanned', 'drop_off_pending'] as const;

export type DriverRosterRecord = {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  contractorType: 'eveider' | 'business';
  businessId: string | null;
  organizationName: string | null;
  dossierStatus: DriverDossierStatus;
  idDocumentUrl: string;
  notes: string | null;
  reviewNotes: string | null;
  invitedAt: Date | null;
  createdAt: Date;
  isBlocked: boolean;
  deactivated: boolean;
  currentTrackingNumber: string | null;
  currentLockerName: string | null;
  deliveriesToday: number;
};

const ROSTER_SELECT = `
  SELECT
    d.id,
    d.user_id,
    d.full_name,
    d.email,
    d.phone,
    d.contractor_type,
    d.business_id,
    b.name AS business_name,
    d.status,
    d.id_document_url,
    d.notes,
    d.review_notes,
    d.invited_at,
    d.created_at,
    COALESCE(u.is_blocked, false) AS is_blocked,
    u.deactivated_at,
    cur.tracking_number AS current_tracking_number,
    cur.locker_name AS current_locker_name,
    COALESCE(today.deliveries_today, 0)::int AS deliveries_today
  FROM driver_dossiers d
  LEFT JOIN users u ON u.id = d.user_id
  LEFT JOIN businesses b ON b.id = d.business_id
  LEFT JOIN LATERAL (
    SELECT p.tracking_number, l.name AS locker_name
    FROM deliveries del
    JOIN parcels p ON p.id = del.parcel_id
    LEFT JOIN lockers l ON l.id = p.locker_id
    WHERE d.user_id IS NOT NULL
      AND del.driver_id = d.user_id
      AND del.status = ANY($1)
    ORDER BY del.created_at DESC
    LIMIT 1
  ) cur ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS deliveries_today
    FROM deliveries del
    WHERE d.user_id IS NOT NULL
      AND del.driver_id = d.user_id
      AND (del.created_at AT TIME ZONE 'Africa/Kinshasa')::date
          = (NOW() AT TIME ZONE 'Africa/Kinshasa')::date
  ) today ON true
`;

function mapRosterRow(row: Record<string, unknown>): DriverRosterRecord {
  const contractorType = row.contractor_type === 'business' ? 'business' : 'eveider';
  return {
    id: String(row.id),
    userId: row.user_id == null ? null : String(row.user_id),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    contractorType,
    businessId: row.business_id == null ? null : String(row.business_id),
    organizationName: row.business_name == null ? null : String(row.business_name),
    dossierStatus: row.status as DriverDossierStatus,
    idDocumentUrl: String(row.id_document_url),
    notes: row.notes == null ? null : String(row.notes),
    reviewNotes: row.review_notes == null ? null : String(row.review_notes),
    invitedAt: row.invited_at ? new Date(String(row.invited_at)) : null,
    createdAt: new Date(String(row.created_at)),
    isBlocked: Boolean(row.is_blocked),
    deactivated: row.deactivated_at != null,
    currentTrackingNumber:
      row.current_tracking_number == null ? null : String(row.current_tracking_number),
    currentLockerName: row.current_locker_name == null ? null : String(row.current_locker_name),
    deliveriesToday: Number(row.deliveries_today ?? 0),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class CourierDossierRepository {
  constructor(private readonly db: Queryable) {}

  async findById(id: string): Promise<CourierDossier | null> {
    const result = await this.db.query(`SELECT * FROM driver_dossiers WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? mapCourierDossier(row) : null;
  }

  async findByUserId(userId: string): Promise<CourierDossier | null> {
    const result = await this.db.query(
      `SELECT * FROM driver_dossiers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? mapCourierDossier(row) : null;
  }

  async findOpenByEmail(email: string): Promise<CourierDossier | null> {
    const result = await this.db.query(
      `SELECT * FROM driver_dossiers
       WHERE lower(email) = $1 AND status <> 'rejected'
       LIMIT 1`,
      [normalizeEmail(email)],
    );
    const row = result.rows[0];
    return row ? mapCourierDossier(row) : null;
  }

  async listForAdmin(status?: CourierDossierStatus): Promise<CourierDossier[]> {
    const result = status
      ? await this.db.query(
          `SELECT * FROM driver_dossiers WHERE status = $1 ORDER BY created_at DESC`,
          [status],
        )
      : await this.db.query(`SELECT * FROM driver_dossiers ORDER BY created_at DESC`);
    return result.rows.map(mapCourierDossier);
  }

  async listForBusiness(ctx: DataAccessContext): Promise<CourierDossier[]> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_couriers');
    const result = await this.db.query(
      `SELECT * FROM driver_dossiers
       WHERE contractor_type = 'business' AND business_id = $1
       ORDER BY created_at DESC`,
      [ctx.businessId],
    );
    return result.rows.map(mapCourierDossier);
  }

  async listRosterForBusiness(ctx: DataAccessContext): Promise<DriverRosterRecord[]> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_couriers');
    const result = await this.db.query(
      `${ROSTER_SELECT}
       WHERE d.contractor_type = 'business' AND d.business_id = $2
       ORDER BY d.full_name ASC`,
      [ACTIVE_DELIVERY_STATUSES, ctx.businessId],
    );
    return result.rows.map(mapRosterRow);
  }

  async listRosterForAdmin(ctx: DataAccessContext): Promise<DriverRosterRecord[]> {
    assertAdmin(ctx);
    const result = await this.db.query(
      `${ROSTER_SELECT}
       ORDER BY d.full_name ASC`,
      [ACTIVE_DELIVERY_STATUSES],
    );
    return result.rows.map(mapRosterRow);
  }

  async findRosterForBusiness(
    ctx: DataAccessContext,
    dossierId: string,
  ): Promise<DriverRosterRecord | null> {
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_couriers');
    return this.findRosterByBusiness(ctx.businessId!, dossierId);
  }

  async findRosterByBusiness(
    businessId: string,
    dossierId: string,
  ): Promise<DriverRosterRecord | null> {
    const result = await this.db.query(
      `${ROSTER_SELECT}
       WHERE d.contractor_type = 'business' AND d.business_id = $2 AND d.id = $3
       LIMIT 1`,
      [ACTIVE_DELIVERY_STATUSES, businessId, dossierId],
    );
    const row = result.rows[0];
    return row ? mapRosterRow(row) : null;
  }

  async findRosterById(
    ctx: DataAccessContext,
    dossierId: string,
  ): Promise<DriverRosterRecord | null> {
    assertAdmin(ctx);
    const result = await this.db.query(
      `${ROSTER_SELECT}
       WHERE d.id = $2
       LIMIT 1`,
      [ACTIVE_DELIVERY_STATUSES, dossierId],
    );
    const row = result.rows[0];
    return row ? mapRosterRow(row) : null;
  }

  async create(ctx: DataAccessContext, input: CreateCourierDossierInput): Promise<CourierDossier> {
    if (input.contractorType === 'eveider') {
      assertAdmin(ctx);
      if (input.businessId) {
        throw new Error('Un coursier flotte Eveider ne peut pas être lié à une entreprise');
      }
    } else if (ctx.role === 'admin') {
      if (!input.businessId) {
        throw new Error('Entreprise requise pour un coursier contracté');
      }
    } else {
      assertBusinessRole(ctx);
      assertCompanyPermission(ctx, 'manage_couriers');
      input = { ...input, businessId: ctx.businessId };
    }

    const email = normalizeEmail(input.email);
    const existing = await this.findOpenByEmail(email);
    if (existing) {
      throw new Error('Un dossier coursier existe déjà pour cette adresse e-mail');
    }

    const result = await this.db.query(
      `INSERT INTO driver_dossiers (
         contractor_type, business_id, full_name, email, phone, id_document_url, notes, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.contractorType,
        input.businessId ?? null,
        input.fullName.trim(),
        email,
        input.phone?.trim() || null,
        input.idDocumentUrl.trim(),
        input.notes?.trim() || null,
        ctx.userId ?? null,
      ],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async updateDraft(
    ctx: DataAccessContext,
    id: string,
    input: Partial<CreateCourierDossierInput>,
  ): Promise<CourierDossier> {
    const current = await this.requireInScope(ctx, id);
    if (current.status !== 'needs_correction' && current.status !== 'pending_review') {
      throw new Error('Ce dossier ne peut plus être modifié');
    }

    const email = input.email ? normalizeEmail(input.email) : current.email;
    if (email !== current.email) {
      const existing = await this.findOpenByEmail(email);
      if (existing && existing.id !== id) {
        throw new Error('Un dossier coursier existe déjà pour cette adresse e-mail');
      }
    }

    const nextStatus = current.status === 'needs_correction' ? 'pending_review' : current.status;
    if (nextStatus !== current.status) {
      assertCourierDossierTransition(current.status, nextStatus);
    }

    const result = await this.db.query(
      `UPDATE driver_dossiers
       SET full_name = $2, email = $3, phone = $4, id_document_url = $5, notes = $6,
           status = $7, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        (input.fullName ?? current.fullName).trim(),
        email,
        input.phone === undefined ? current.phone : input.phone?.trim() || null,
        (input.idDocumentUrl ?? current.idDocumentUrl).trim(),
        input.notes === undefined ? current.notes : input.notes?.trim() || null,
        nextStatus,
      ],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async review(
    ctx: DataAccessContext,
    id: string,
    input: ReviewCourierDossierInput,
  ): Promise<CourierDossier> {
    assertAdmin(ctx);
    const current = await this.requireById(id);
    assertCourierDossierTransition(current.status, input.status);
    let nextStatus: CourierDossierStatus = input.status;
    if (input.status === 'approved' && current.userId) {
      assertCourierDossierTransition('approved', 'invited');
      nextStatus = 'invited';
    }

    const result = await this.db.query(
      `UPDATE driver_dossiers
       SET status = $2, review_notes = $3, reviewed_by_user_id = $4, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, nextStatus, input.reviewNotes?.trim() || null, ctx.userId ?? null],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async markInvited(id: string, userId: string): Promise<CourierDossier> {
    const current = await this.requireById(id);
    return this.attachInvite(current, userId);
  }

  /**
   * Links an Auth user after a mobile invite.
   * KYC status stays pending_review until Eveider approves; only `approved` promotes to `invited`.
   */
  async attachInvite(current: CourierDossier, userId: string): Promise<CourierDossier> {
    if (current.status === 'rejected' || current.status === 'deactivated') {
      throw new Error('Ce chauffeur ne peut pas être invité');
    }
    if (current.status === 'approved') {
      assertCourierDossierTransition(current.status, 'invited');
    }

    const nextStatus = current.status === 'approved' ? 'invited' : current.status;
    const result = await this.db.query(
      `UPDATE driver_dossiers
       SET user_id = $2, invited_at = COALESCE(invited_at, NOW()),
           status = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [current.id, userId, nextStatus],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async markActive(userId: string): Promise<CourierDossier | null> {
    const current = await this.findByUserId(userId);
    if (!current || current.status === 'active') return current;
    if (current.status !== 'invited') return current;
    assertCourierDossierTransition(current.status, 'active');
    const result = await this.db.query(
      `UPDATE driver_dossiers SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [current.id],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async deactivate(userId: string): Promise<CourierDossier> {
    const current = await this.findByUserId(userId);
    if (!current) throw new Error('Dossier coursier introuvable');
    assertCourierDossierTransition(current.status, 'deactivated');
    const result = await this.db.query(
      `UPDATE driver_dossiers
       SET status = 'deactivated', deactivated_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [current.id],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async reactivate(ctx: DataAccessContext, id: string): Promise<CourierDossier> {
    const current = await this.requireInScope(ctx, id);
    assertCourierDossierTransition(current.status, 'active');
    const result = await this.db.query(
      `UPDATE driver_dossiers
       SET status = 'active', deactivated_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async requireInScope(ctx: DataAccessContext, id: string): Promise<CourierDossier> {
    const dossier = await this.requireById(id);
    if (ctx.role === 'admin') return dossier;
    assertBusinessRole(ctx);
    assertCompanyPermission(ctx, 'manage_couriers');
    if (dossier.contractorType !== 'business' || dossier.businessId !== ctx.businessId) {
      throw new AccessDeniedError('Dossier hors périmètre');
    }
    return dossier;
  }

  private async requireById(id: string): Promise<CourierDossier> {
    const dossier = await this.findById(id);
    if (!dossier) throw new Error('Dossier coursier introuvable');
    return dossier;
  }
}
