import { isDrcCity, type ServiceAreaStatus } from '@eveider/domain';
import { assertAdmin, assertBusinessRole, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapServiceArea } from '../db/mappers.js';
import type { ServiceArea } from '../db/types.js';

export type ServiceAreaSummary = ServiceArea & {
  lockerCount: number;
};

export type CreateServiceAreaInput = {
  code: string;
  name: string;
  city: string;
  notes?: string | null;
  status?: ServiceAreaStatus;
};

export type UpdateServiceAreaInput = {
  code?: string;
  name?: string;
  city?: string;
  notes?: string | null;
  status?: ServiceAreaStatus;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export class ServiceAreaRepository {
  constructor(private readonly db: Queryable) {}

  async list(
    ctx: DataAccessContext,
    options?: { status?: ServiceAreaStatus; city?: string; includeArchived?: boolean },
  ): Promise<ServiceAreaSummary[]> {
    assertAdmin(ctx);

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options?.status) {
      params.push(options.status);
      conditions.push(`sa.status = $${params.length}`);
    } else if (!options?.includeArchived) {
      conditions.push(`sa.status = 'active'`);
    }

    if (options?.city) {
      params.push(options.city);
      conditions.push(`sa.city = $${params.length}`);
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';
    const result = await this.db.query(
      `SELECT sa.*,
              COALESCE(l.locker_count, 0)::int AS locker_count
       FROM service_areas sa
       LEFT JOIN (
         SELECT service_area_id, COUNT(*)::int AS locker_count
         FROM lockers
         WHERE archived_at IS NULL AND status <> 'archived'
         GROUP BY service_area_id
       ) l ON l.service_area_id = sa.id
       WHERE ${where}
       ORDER BY sa.city ASC, sa.name ASC`,
      params,
    );

    return result.rows.map((row) => ({
      ...mapServiceArea(row),
      lockerCount: Number(row.locker_count ?? 0),
    }));
  }

  async listActiveOptions(ctx: DataAccessContext): Promise<Array<Pick<ServiceArea, 'id' | 'code' | 'name' | 'city'>>> {
    // Active zone pickers are needed on admin and organisation driver screens.
    if (ctx.role !== 'admin') {
      assertBusinessRole(ctx);
    }
    const result = await this.db.query(
      `SELECT id, code, name, city
       FROM service_areas
       WHERE status = 'active'
       ORDER BY city ASC, name ASC`,
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      city: String(row.city),
    }));
  }

  async findById(ctx: DataAccessContext, id: string): Promise<ServiceAreaSummary | null> {
    assertAdmin(ctx);
    const result = await this.db.query(
      `SELECT sa.*,
              COALESCE(l.locker_count, 0)::int AS locker_count
       FROM service_areas sa
       LEFT JOIN (
         SELECT service_area_id, COUNT(*)::int AS locker_count
         FROM lockers
         WHERE archived_at IS NULL AND status <> 'archived'
         GROUP BY service_area_id
       ) l ON l.service_area_id = sa.id
       WHERE sa.id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...mapServiceArea(row),
      lockerCount: Number(row.locker_count ?? 0),
    };
  }

  async assertActive(id: string): Promise<ServiceArea> {
    const result = await this.db.query(
      `SELECT * FROM service_areas WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Zone de service introuvable');
    const area = mapServiceArea(row);
    if (area.status !== 'active') {
      throw new Error('Cette zone de service n’est plus active');
    }
    return area;
  }

  async create(ctx: DataAccessContext, input: CreateServiceAreaInput): Promise<ServiceAreaSummary> {
    assertAdmin(ctx);
    if (!isDrcCity(input.city)) {
      throw new Error('Ville invalide');
    }
    const code = normalizeCode(input.code);
    const created = await this.db.query(
      `INSERT INTO service_areas (code, name, city, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        code,
        input.name.trim(),
        input.city,
        input.status ?? 'active',
        input.notes?.trim() || null,
      ],
    );
    const area = mapServiceArea(created.rows[0]!);
    return { ...area, lockerCount: 0 };
  }

  async update(
    ctx: DataAccessContext,
    id: string,
    input: UpdateServiceAreaInput,
  ): Promise<ServiceAreaSummary> {
    assertAdmin(ctx);
    const existing = await this.findById(ctx, id);
    if (!existing) throw new Error('Zone de service introuvable');

    if (input.city != null && !isDrcCity(input.city)) {
      throw new Error('Ville invalide');
    }

    const nextCode = input.code != null ? normalizeCode(input.code) : existing.code;
    const nextName = input.name?.trim() ?? existing.name;
    const nextCity = input.city ?? existing.city;
    const nextStatus = input.status ?? existing.status;
    const nextNotes =
      input.notes !== undefined ? input.notes?.trim() || null : existing.notes;

    const updated = await this.db.query(
      `UPDATE service_areas SET
         code = $1,
         name = $2,
         city = $3,
         status = $4,
         notes = $5,
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [nextCode, nextName, nextCity, nextStatus, nextNotes, id],
    );

    return {
      ...mapServiceArea(updated.rows[0]!),
      lockerCount: existing.lockerCount,
    };
  }
}
