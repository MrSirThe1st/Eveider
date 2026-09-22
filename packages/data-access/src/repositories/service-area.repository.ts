import { generateZoneCode, isDrcCity, type ServiceAreaStatus, type ZonePricingAmount } from '@eveider/domain';
import { assertAdmin, assertBusinessRole, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapServiceArea } from '../db/mappers.js';
import type { ServiceArea } from '../db/types.js';
import { CityRepository } from './city.repository.js';

export type ServiceAreaSummary = ServiceArea & {
  lockerCount: number;
};

export type CreateServiceAreaInput = {
  name: string;
  city?: string;
  cityId?: string;
  notes?: string | null;
  status?: ServiceAreaStatus;
  outboundDeliveryAmount?: ZonePricingAmount;
  returnDeliveryAmount?: ZonePricingAmount;
};

export type UpdateServiceAreaInput = {
  name?: string;
  city?: string;
  cityId?: string;
  notes?: string | null;
  status?: ServiceAreaStatus;
  outboundDeliveryAmount?: ZonePricingAmount;
  returnDeliveryAmount?: ZonePricingAmount;
};

const ZONE_SELECT = `SELECT sa.id, sa.code, sa.name, sa.city, sa.city_id, sa.status, sa.notes,
              sa.is_holding, sa.created_at, sa.updated_at,
              c.name AS city_name,
              zp.outbound_delivery_amount,
              zp.return_delivery_amount,
              COALESCE(l.locker_count, 0)::int AS locker_count
       FROM service_areas sa
       JOIN cities c ON c.id = sa.city_id
       LEFT JOIN zone_pricing zp ON zp.zone_id = sa.id
       LEFT JOIN (
         SELECT service_area_id, COUNT(*)::int AS locker_count
         FROM lockers
         WHERE archived_at IS NULL AND status <> 'archived'
         GROUP BY service_area_id
       ) l ON l.service_area_id = sa.id`;

function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && String(error.code) === '23503';
}

function uniqueConstraint(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'constraint' in error) {
    return String((error as { constraint: string }).constraint);
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && String(error.code) === '23505';
}

function isArchiveBlocked(error: unknown): boolean {
  return error instanceof Error && error.message.includes('ZONE_HAS_ACTIVE_LOCKERS');
}

function mapSummary(row: Record<string, unknown>): ServiceAreaSummary {
  return {
    ...mapServiceArea(row),
    lockerCount: Number(row.locker_count ?? 0),
  };
}

export class ServiceAreaRepository {
  constructor(private readonly db: Queryable) {}

  async list(
    ctx: DataAccessContext,
    options?: { status?: ServiceAreaStatus; city?: string; cityId?: string; includeArchived?: boolean },
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

    if (options?.cityId) {
      params.push(options.cityId);
      conditions.push(`sa.city_id = $${params.length}`);
    } else if (options?.city) {
      params.push(options.city);
      conditions.push(`c.name = $${params.length}`);
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';
    const result = await this.db.query(
      `${ZONE_SELECT}
       WHERE ${where}
       ORDER BY c.name ASC, sa.name ASC`,
      params,
    );

    return result.rows.map(mapSummary);
  }

  async listActiveOptions(
    ctx: DataAccessContext,
  ): Promise<Array<Pick<ServiceArea, 'id' | 'code' | 'name' | 'city' | 'cityId' | 'isHolding'>>> {
    if (ctx.role !== 'admin') {
      assertBusinessRole(ctx);
    }
    const result = await this.db.query(
      `SELECT sa.id, sa.code, sa.name, c.name AS city, sa.city_id, sa.is_holding
       FROM service_areas sa
       JOIN cities c ON c.id = sa.city_id
       WHERE sa.status = 'active' AND c.status = 'active'
       ORDER BY c.name ASC, sa.name ASC`,
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      city: String(row.city),
      cityId: String(row.city_id),
      isHolding: row.is_holding === true,
    }));
  }

  async findById(ctx: DataAccessContext, id: string): Promise<ServiceAreaSummary | null> {
    assertAdmin(ctx);
    const result = await this.db.query(`${ZONE_SELECT} WHERE sa.id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? mapSummary(row) : null;
  }

  async assertActive(id: string): Promise<ServiceArea> {
    const result = await this.db.query(
      `SELECT sa.id, sa.code, sa.name, sa.city, sa.city_id, sa.status, sa.notes,
              sa.is_holding, sa.created_at, sa.updated_at,
              c.name AS city_name,
              c.status AS city_status,
              zp.outbound_delivery_amount,
              zp.return_delivery_amount
       FROM service_areas sa
       JOIN cities c ON c.id = sa.city_id
       LEFT JOIN zone_pricing zp ON zp.zone_id = sa.id
       WHERE sa.id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Zone de service introuvable');
    const area = mapServiceArea(row);
    if (area.status !== 'active') {
      throw new Error('Cette zone de service n’est plus active');
    }
    if (String(row.city_status) !== 'active') {
      throw new Error('Cette ville n’est plus active');
    }
    return area;
  }

  async create(ctx: DataAccessContext, input: CreateServiceAreaInput): Promise<ServiceAreaSummary> {
    assertAdmin(ctx);
    const city = await this.resolveCity(input.cityId, input.city);
    const id = await this.insertNeighborhood(city, input);
    await this.db.query(
      `INSERT INTO zone_pricing (zone_id, outbound_delivery_amount, return_delivery_amount)
       VALUES ($1, $2, $3)`,
      [id, input.outboundDeliveryAmount ?? null, input.returnDeliveryAmount ?? null],
    );
    const loaded = await this.findById(ctx, id);
    if (!loaded) throw new Error('Zone de service introuvable');
    return loaded;
  }

  async update(
    ctx: DataAccessContext,
    id: string,
    input: UpdateServiceAreaInput,
  ): Promise<ServiceAreaSummary> {
    assertAdmin(ctx);
    const existing = await this.findById(ctx, id);
    if (!existing) throw new Error('Zone de service introuvable');

    const nextCity =
      input.cityId != null || input.city != null
        ? await this.resolveCity(input.cityId, input.city)
        : { id: existing.cityId, name: existing.city };

    const nextCode = existing.code;
    const nextName = input.name?.trim() ?? existing.name;
    const nextStatus = input.status ?? existing.status;
    const nextNotes =
      input.notes !== undefined ? input.notes?.trim() || null : existing.notes;

    try {
      await this.db.query(
        `UPDATE service_areas SET
           code = $1,
           name = $2,
           city = $3,
           city_id = $4,
           status = $5,
           notes = $6,
           updated_at = NOW()
         WHERE id = $7`,
        [nextCode, nextName, nextCity.name, nextCity.id, nextStatus, nextNotes, id],
      );
    } catch (error) {
      if (isArchiveBlocked(error)) {
        throw new Error('Impossible d’archiver une zone qui a encore des casiers actifs');
      }
      if (isUniqueViolation(error)) {
        throw new Error('Ce nom de zone existe déjà dans cette ville');
      }
      throw error;
    }

    if (input.outboundDeliveryAmount !== undefined || input.returnDeliveryAmount !== undefined) {
      await this.db.query(
        `INSERT INTO zone_pricing (zone_id, outbound_delivery_amount, return_delivery_amount, updated_at, updated_by)
         VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT (zone_id) DO UPDATE SET
           outbound_delivery_amount = EXCLUDED.outbound_delivery_amount,
           return_delivery_amount = EXCLUDED.return_delivery_amount,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
        [
          id,
          input.outboundDeliveryAmount !== undefined
            ? input.outboundDeliveryAmount
            : existing.outboundDeliveryAmount,
          input.returnDeliveryAmount !== undefined
            ? input.returnDeliveryAmount
            : existing.returnDeliveryAmount,
          ctx.userId ?? null,
        ],
      );
    }

    const loaded = await this.findById(ctx, id);
    if (!loaded) throw new Error('Zone de service introuvable');
    return loaded;
  }

  async delete(ctx: DataAccessContext, id: string): Promise<void> {
    assertAdmin(ctx);
    const existing = await this.findById(ctx, id);
    if (!existing) throw new Error('Zone de service introuvable');
    if (existing.isHolding) {
      throw new Error('Cette zone ne peut pas être supprimée');
    }
    if (existing.lockerCount > 0) {
      throw new Error(
        `Impossible de supprimer « ${existing.name} » : réassignez d’abord ses casiers actifs`,
      );
    }

    try {
      await this.db.query(`DELETE FROM service_areas WHERE id = $1`, [id]);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error(
          `Impossible de supprimer « ${existing.name} » : réassignez d’abord ses casiers actifs`,
        );
      }
      throw error;
    }
  }

  private async insertNeighborhood(
    city: { id: string; name: string },
    input: CreateServiceAreaInput,
  ): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateZoneCode();
      try {
        const created = await this.db.query(
          `INSERT INTO service_areas (code, name, city, city_id, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            code,
            input.name.trim(),
            city.name,
            city.id,
            input.status ?? 'active',
            input.notes?.trim() || null,
          ],
        );
        return String(created.rows[0]!.id);
      } catch (error) {
        const constraint = uniqueConstraint(error);
        if (constraint === 'service_areas_code_key' && attempt < 7) continue;
        if (constraint === 'service_areas_city_id_name_key') {
          throw new Error('Ce nom de zone existe déjà dans cette ville');
        }
        if (isUniqueViolation(error) && attempt < 7) continue;
        if (isUniqueViolation(error)) {
          throw new Error('Ce nom de zone existe déjà dans cette ville');
        }
        throw error;
      }
    }
    throw new Error('Impossible de créer la zone');
  }

  private async resolveCity(
    cityId: string | undefined,
    cityName: string | undefined,
  ): Promise<{ id: string; name: string }> {
    const cities = new CityRepository(this.db);
    if (cityId) {
      const city = await cities.assertActive(cityId);
      return { id: city.id, name: city.name };
    }
    if (!cityName || !isDrcCity(cityName)) {
      throw new Error('Ville invalide');
    }
    const city = await cities.findByName(cityName);
    if (!city) throw new Error('Ville introuvable');
    if (city.status !== 'active') {
      throw new Error('Cette ville n’est plus active');
    }
    return { id: city.id, name: city.name };
  }
}
