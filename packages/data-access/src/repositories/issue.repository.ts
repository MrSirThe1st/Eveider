import { transitionIssue, type IssueStatus, type IssueType } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapIssue } from '../db/mappers.js';
import type { Issue, Locker, Parcel, User } from '../db/types.js';
import {
  AccessDeniedError,
  assertAdmin,
  assertCourierRole,
  assertCustomerOwnsParcel,
  assertCustomerRole,
  type DataAccessContext,
} from '../context.js';

const CUSTOMER_ISSUE_TYPES: IssueType[] = [
  'parcel_problem',
  'locker_unavailable',
  'locker_system',
];

const COURIER_ISSUE_TYPES: IssueType[] = [
  'failed_delivery',
  'locker_unavailable',
  'parcel_problem',
];

export type IssueWithRelations = Issue & {
  parcel: Pick<Parcel, 'id' | 'reference'> | null;
  locker: Pick<Locker, 'id' | 'name'> | null;
  reporter: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
};

export type CreateIssueInput = {
  type: IssueType;
  parcelId?: string;
  lockerId?: string;
  description: string;
};

export class IssueRepository {
  constructor(private readonly db: Queryable) {}

  private async loadWithRelations(where: string, values: unknown[]): Promise<IssueWithRelations[]> {
    const result = await this.db.query(
      `SELECT i.*, p.id AS parcel_relation_id, p.reference AS parcel_reference,
              l.id AS locker_relation_id, l.name AS locker_name,
              u.id AS reporter_relation_id, u.full_name AS reporter_full_name,
              u.email AS reporter_email, u.role AS reporter_role
       FROM issues i
       LEFT JOIN parcels p ON p.id = i.parcel_id
       LEFT JOIN lockers l ON l.id = i.locker_id
       JOIN users u ON u.id = i.reporter_id
       WHERE ${where} ORDER BY i.created_at DESC`,
      values,
    );
    return result.rows.map((row) => ({
      ...mapIssue(row),
      parcel: row.parcel_relation_id ? { id: String(row.parcel_relation_id), reference: String(row.parcel_reference) } : null,
      locker: row.locker_relation_id ? { id: String(row.locker_relation_id), name: String(row.locker_name) } : null,
      reporter: { id: String(row.reporter_relation_id), fullName: row.reporter_full_name == null ? null : String(row.reporter_full_name), email: row.reporter_email == null ? null : String(row.reporter_email), role: row.reporter_role as User['role'] },
    }));
  }

  async create(ctx: DataAccessContext, input: CreateIssueInput): Promise<IssueWithRelations> {
    if (ctx.role === 'customer') {
      return this.createForCustomer(ctx, input);
    }
    if (ctx.role === 'courier') {
      return this.createForCourier(ctx, input);
    }
    throw new AccessDeniedError('Customer or courier role required');
  }

  async listForReporter(ctx: DataAccessContext): Promise<IssueWithRelations[]> {
    if (!ctx.userId) {
      throw new AccessDeniedError('User required');
    }
    if (ctx.role !== 'customer' && ctx.role !== 'courier') {
      throw new AccessDeniedError('Customer or courier role required');
    }

    return this.loadWithRelations('i.reporter_id = $1', [ctx.userId]);
  }

  async listAll(
    ctx: DataAccessContext,
    options?: { status?: IssueStatus },
  ): Promise<IssueWithRelations[]> {
    assertAdmin(ctx);

    return options?.status ? this.loadWithRelations('i.status = $1', [options.status]) : this.loadWithRelations('TRUE', []);
  }

  async updateStatus(
    ctx: DataAccessContext,
    id: string,
    status: IssueStatus,
  ): Promise<IssueWithRelations> {
    assertAdmin(ctx);

    const found = await this.db.query(`SELECT * FROM issues WHERE id = $1 LIMIT 1`, [id]);
    if (!found.rows[0]) throw new Error(`Issue ${id} not found`);
    const issue = mapIssue(found.rows[0]);
    transitionIssue(issue.status, status);
    await this.db.query(`UPDATE issues SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
    return (await this.loadWithRelations('i.id = $1', [id]))[0]!;
  }

  private async createForCustomer(
    ctx: DataAccessContext,
    input: CreateIssueInput,
  ): Promise<IssueWithRelations> {
    assertCustomerRole(ctx);
    this.assertAllowedType(input.type, CUSTOMER_ISSUE_TYPES);

    let lockerId = input.lockerId;

    if (input.parcelId) {
      const result = await this.db.query(`SELECT customer_id, recipient_phone, locker_id FROM parcels WHERE id = $1 LIMIT 1`, [input.parcelId]);
      if (!result.rows[0]) throw new Error(`Parcel ${input.parcelId} not found`);
      const parcel = result.rows[0];
      assertCustomerOwnsParcel(ctx, parcel.customer_id == null ? null : String(parcel.customer_id), String(parcel.recipient_phone));
      lockerId ??= parcel.locker_id == null ? undefined : String(parcel.locker_id);
    }

    if (input.lockerId) {
      const locker = await this.db.query(`SELECT id FROM lockers WHERE id = $1`, [input.lockerId]);
      if (!locker.rows[0]) throw new Error(`Locker ${input.lockerId} not found`);
    }

    const created = await this.db.query(`INSERT INTO issues (type, description, parcel_id, locker_id, reporter_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [input.type, input.description, input.parcelId ?? null, lockerId ?? null, ctx.userId!]);
    return (await this.loadWithRelations('i.id = $1', [created.rows[0]!.id]))[0]!;
  }

  private async createForCourier(
    ctx: DataAccessContext,
    input: CreateIssueInput,
  ): Promise<IssueWithRelations> {
    assertCourierRole(ctx);
    this.assertAllowedType(input.type, COURIER_ISSUE_TYPES);

    if (!input.parcelId) {
      throw new Error('Le colis est requis pour signaler un incident');
    }

    const delivery = await this.db.query(`SELECT id FROM deliveries WHERE parcel_id = $1 AND courier_id = $2 LIMIT 1`, [input.parcelId, ctx.userId]);
    if (!delivery.rows[0]) {
      throw new AccessDeniedError('Livraison non assignée');
    }

    const parcelResult = await this.db.query(`SELECT locker_id FROM parcels WHERE id = $1 LIMIT 1`, [input.parcelId]);
    if (!parcelResult.rows[0]) throw new Error(`Parcel ${input.parcelId} not found`);
    const lockerId = input.lockerId ?? (parcelResult.rows[0].locker_id == null ? undefined : String(parcelResult.rows[0].locker_id));

    if (lockerId) {
      const locker = await this.db.query(`SELECT id FROM lockers WHERE id = $1`, [lockerId]);
      if (!locker.rows[0]) throw new Error(`Locker ${lockerId} not found`);
    }

    const created = await this.db.query(`INSERT INTO issues (type, description, parcel_id, locker_id, reporter_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [input.type, input.description, input.parcelId, lockerId ?? null, ctx.userId!]);
    return (await this.loadWithRelations('i.id = $1', [created.rows[0]!.id]))[0]!;
  }

  private assertAllowedType(type: IssueType, allowed: IssueType[]): void {
    if (!allowed.includes(type)) {
      throw new Error('Type d\'incident non autorisé pour ce rôle');
    }
  }
}
