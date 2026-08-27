import {
  assertCourierDossierTransition,
  type CourierContractorKind,
  type CourierDossierStatus,
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

    const result = await this.db.query(
      `UPDATE driver_dossiers
       SET status = $2, review_notes = $3, reviewed_by_user_id = $4, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, input.status, input.reviewNotes?.trim() || null, ctx.userId ?? null],
    );
    return mapCourierDossier(result.rows[0]!);
  }

  async markInvited(id: string, userId: string): Promise<CourierDossier> {
    const current = await this.requireById(id);
    assertCourierDossierTransition(current.status, 'invited');
    const result = await this.db.query(
      `UPDATE driver_dossiers
       SET status = 'invited', user_id = $2, invited_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, userId],
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
